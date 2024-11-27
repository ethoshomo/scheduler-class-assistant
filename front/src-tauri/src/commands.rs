use serde_json::Value;
use std::collections::HashSet;
use std::sync::LazyLock;
use std::sync::Mutex;
use tauri::command;
use tauri_plugin_shell::{process::CommandEvent, ShellExt};

// Track active commands with LazyLock
static ACTIVE_COMMANDS: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));

#[command]
pub async fn run_algorithm(
    app: tauri::AppHandle,
    command_id: String,
    algorithm: String,
    tutors_data_file_path: String,
    courses_data_file_path: String,
    min_grade: f64,
    preference_flag: i32,
    generation_number: Option<i32>,
    population_size: Option<i32>,
) -> Result<Value, String> {
    // Verify file extensions
    for path in [&tutors_data_file_path, &courses_data_file_path] {
        if !path.ends_with(".xlsx") {
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
        // Create the sidecar command
        let binary_name = if algorithm == "genetic" {
            "genetic"
        } else {
            "linear"
        };

        // Prepare the arguments
        let mut args = vec![
            tutors_data_file_path,
            courses_data_file_path,
            min_grade.to_string(),
            preference_flag.to_string(),
        ];

        // Add genetic algorithm specific parameters if present
        if algorithm == "genetic" {
            args.push(generation_number.unwrap_or(50).to_string()); // Default to 50 generations
            args.push(population_size.unwrap_or(500).to_string()); // Default to 500 population
        } else {
            args.push("0".to_string());
            args.push("0".to_string());
        }

        let (mut rx, child) = app
            .shell()
            .sidecar(binary_name)
            .expect("failed to create sidecar command")
            .args(args)
            .spawn()
            .map_err(|e| format!("Failed to execute program: {}", e))?;

        let mut output = String::new();
        let mut error = String::new();

        // Create a tokio runtime for async operations
        let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;

        rt.block_on(async {
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        output = String::from_utf8_lossy(&line).into_owned();
                    }
                    CommandEvent::Stderr(line) => {
                        error = String::from_utf8_lossy(&line).into_owned();
                    }
                    CommandEvent::Terminated(status) => {
                        // Remove command from active set
                        ACTIVE_COMMANDS
                            .lock()
                            .map_err(|_| "Lock error")?
                            .remove(&command_id);

                        if status.code == Some(0) {
                            return serde_json::from_str(&output).map_err(|e| {
                                format!("Failed to parse algorithm output as JSON: {}", e)
                            });
                        } else {
                            match serde_json::from_str::<Value>(&error) {
                                Ok(error_json) => {
                                    if let Some(error_msg) =
                                        error_json.get("error").and_then(|e| e.as_str())
                                    {
                                        return Err(error_msg.to_string());
                                    }
                                }
                                Err(_) => {}
                            }
                            return Err(error);
                        }
                    }
                    _ => {}
                }

                // Check if command was cancelled
                let is_active = ACTIVE_COMMANDS
                    .lock()
                    .map_err(|_| "Lock error")?
                    .contains(&command_id);

                if !is_active {
                    child.kill().map_err(|e| e.to_string())?;
                    return Err("Command cancelled".into());
                }
            }

            Err("Process terminated unexpectedly".into())
        })
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
