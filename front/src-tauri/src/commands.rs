use serde_json::Value;
use std::path::Path;
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
const BINARY_PATH: &str = "binaries/x86_64-pc-windows-msvc/back.exe";

#[cfg(target_os = "linux")]
const BINARY_PATH: &str = "binaries/x86_64-unknown-linux-gnu/back";

#[tauri::command]
pub async fn process_data(file_path: String) -> Result<Value, String> {
    // Verify file exists and has correct extension
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("File does not exist".into());
    }

    // Check for valid extensions
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .ok_or("File has no extension")?;

    if extension != "xlsx" {
        return Err("File must be an XLSX file".into());
    }

    // Construct the path to the executable
    let executable = Path::new(env!("CARGO_MANIFEST_DIR")).join(BINARY_PATH);

    // Execute the program and capture output directly
    let output = Command::new(executable)
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to execute program: {}", e))?;

    // Check if the process succeeded
    if output.status.success() {
        // Parse successful output
        let output_str = String::from_utf8_lossy(&output.stdout);
        serde_json::from_str(&output_str)
            .map_err(|e| format!("Failed to parse back output as JSON: {}", e))
    } else {
        // Parse error output
        let error = String::from_utf8_lossy(&output.stderr);
        match serde_json::from_str::<Value>(&error) {
            Ok(error_json) => {
                if let Some(error_msg) = error_json.get("error").and_then(|e| e.as_str()) {
                    Err(error_msg.to_string())
                } else {
                    Err("Unknown error occurred in back".to_string())
                }
            }
            Err(_) => Err(error.to_string()),
        }
    }
}
