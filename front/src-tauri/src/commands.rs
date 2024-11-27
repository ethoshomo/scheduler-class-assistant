use serde_json::Value;
use std::collections::HashSet;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::LazyLock;
use std::sync::Mutex;
use tauri::command;

// Track active commands with LazyLock
static ACTIVE_COMMANDS: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));

#[cfg(target_os = "windows")]
const GENETIC_BINARY_PATH: &str = "binaries/x86_64-pc-windows-msvc/genetic.exe";
#[cfg(target_os = "windows")]
const LINEAR_BINARY_PATH: &str = "binaries/x86_64-pc-windows-msvc/linear.exe";

#[cfg(target_os = "linux")]
const GENETIC_BINARY_PATH: &str = "binaries/x86_64-unknown-linux-gnu/genetic";
#[cfg(target_os = "linux")]
const LINEAR_BINARY_PATH: &str = "binaries/x86_64-unknown-linux-gnu/linear";

fn get_algorithm_path(algorithm: &str) -> Result<std::path::PathBuf, String> {
    let binary_path = match algorithm {
        "genetic" => GENETIC_BINARY_PATH,
        "linear" => LINEAR_BINARY_PATH,
        _ => return Err("Invalid algorithm specified".into()),
    };

    Ok(Path::new(env!("CARGO_MANIFEST_DIR")).join(binary_path))
}

#[command]
pub async fn run_algorithm(
    command_id: String,
    algorithm: String,
    tutors_data_file_path: String,
    courses_data_file_path: String,
) -> Result<Value, String> {
    // Verify tutors file exists and has correct extension
    let tutors_path = Path::new(&tutors_data_file_path);
    if !tutors_path.exists() {
        return Err("Tutors file does not exist".into());
    }

    // Verify courses file exists
    let courses_path = Path::new(&courses_data_file_path);
    if !courses_path.exists() {
        return Err("Courses file does not exist".into());
    }

    // Check for valid extensions
    for path in [tutors_path, courses_path] {
        let extension = path
            .extension()
            .and_then(|ext| ext.to_str())
            .ok_or("File has no extension")?;

        if extension != "xlsx" {
            return Err("Files must be XLSX files".into());
        }
    }

    // Add command to active set
    {
        ACTIVE_COMMANDS
            .lock()
            .map_err(|_| "Lock error")?
            .insert(command_id.clone());
    }

    let result = std::thread::spawn(move || {
        let executable = get_algorithm_path(&algorithm)?;

        let mut process = Command::new(executable)
            .arg(&tutors_data_file_path)
            .arg(&courses_data_file_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to execute program: {}", e))?;

        loop {
            // Check if command was cancelled
            let is_active = ACTIVE_COMMANDS
                .lock()
                .map_err(|_| "Lock error")?
                .contains(&command_id);

            if !is_active {
                process.kill().map_err(|e| e.to_string())?;
                return Err("Command cancelled".into());
            }

            // Check if process has completed
            match process.try_wait().map_err(|e| e.to_string())? {
                Some(status) => {
                    // Process completed
                    let output = process.wait_with_output().map_err(|e| e.to_string())?;

                    // Remove command from active set
                    ACTIVE_COMMANDS
                        .lock()
                        .map_err(|_| "Lock error")?
                        .remove(&command_id);

                    if status.success() {
                        // Parse successful output
                        let output_str = String::from_utf8_lossy(&output.stdout);
                        return serde_json::from_str(&output_str).map_err(|e| {
                            format!("Failed to parse algorithm output as JSON: {}", e)
                        });
                    } else {
                        // Parse error output
                        let error = String::from_utf8_lossy(&output.stderr);
                        match serde_json::from_str::<Value>(&error) {
                            Ok(error_json) => {
                                if let Some(error_msg) =
                                    error_json.get("error").and_then(|e| e.as_str())
                                {
                                    return Err(error_msg.to_string());
                                } else {
                                    return Err("Unknown error occurred in algorithm".to_string());
                                }
                            }
                            Err(_) => return Err(error.to_string()),
                        }
                    }
                }
                None => {
                    // Process still running
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    continue;
                }
            }
        }
    })
    .join()
    .map_err(|_| "Thread panic occurred".to_string())??;

    Ok(result)
}

#[command]
pub async fn cancel_algorithm(command_id: String) -> Result<(), String> {
    ACTIVE_COMMANDS
        .lock()
        .map_err(|_| "Lock error")?
        .remove(&command_id);
    Ok(())
}
