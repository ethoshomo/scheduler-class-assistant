use std::path::Path;
use std::process::Command;

#[cfg(target_os = "windows")]
const BINARY_PATH: &str = "binaries/x86_64-pc-windows-msvc/back.exe";

#[cfg(target_os = "linux")]
const BINARY_PATH: &str = "binaries/x86_64-unknown-linux-gnu/back";

#[tauri::command]
pub async fn process_excel_file(file_path: String) -> Result<String, String> {
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

    if extension != "xlsx" && extension != "csv" {
        return Err("File must be an XLSX or CSV file".into());
    }

    // Construct the path to the executable
    let executable = Path::new(env!("CARGO_MANIFEST_DIR")).join(BINARY_PATH);

    // Execute the compiled program with the file path as argument
    let output = Command::new(executable)
        .arg(&file_path)
        .output()
        .map_err(|e| format!("Failed to execute program: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Program execution failed: {}", error));
    }

    // Return the program's output
    let result = String::from_utf8_lossy(&output.stdout);
    Ok(result.into_owned())
}
