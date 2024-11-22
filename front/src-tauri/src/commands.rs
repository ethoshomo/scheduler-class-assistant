use serde_json::Value;
use std::path::Path;
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
const GENETIC_BINARY_PATH: &str = "binaries/x86_64-pc-windows-msvc/genetic.exe";
#[cfg(target_os = "windows")]
const SIMPLEX_BINARY_PATH: &str = "binaries/x86_64-pc-windows-msvc/simplex.exe";

#[cfg(target_os = "linux")]
const GENETIC_BINARY_PATH: &str = "binaries/x86_64-unknown-linux-gnu/genetic";
#[cfg(target_os = "linux")]
const SIMPLEX_BINARY_PATH: &str = "binaries/x86_64-unknown-linux-gnu/simplex";

#[tauri::command]
pub async fn run_algorithm(
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

    // Select the appropriate binary based on the algorithm
    let binary_path = match algorithm.as_str() {
        "genetic" => GENETIC_BINARY_PATH,
        "simplex" => SIMPLEX_BINARY_PATH,
        _ => return Err("Invalid algorithm specified".into()),
    };

    // Construct the path to the executable
    let executable = Path::new(env!("CARGO_MANIFEST_DIR")).join(binary_path);

    // Execute the program with both file paths and capture output
    let output = Command::new(executable)
        .arg(&tutors_data_file_path)
        .arg(&courses_data_file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute program: {}", e))?;

    // Check if the process succeeded
    if output.status.success() {
        // Parse successful output
        let output_str = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str(&output_str)
            .map_err(|e| format!("Failed to parse algorithm output as JSON: {}", e))
    } else {
        // Parse error output
        let error = String::from_utf8_lossy(&output.stderr);
        match serde_json::from_str::<Value>(&error) {
            Ok(error_json) => {
                if let Some(error_msg) = error_json.get("error").and_then(|e| e.as_str()) {
                    Err(error_msg.to_string())
                } else {
                    Err("Unknown error occurred in algorithm".to_string())
                }
            }
            Err(_) => Err(error.to_string()),
        }
    }
}
