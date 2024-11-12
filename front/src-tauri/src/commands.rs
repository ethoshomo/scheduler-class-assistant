use std::path::Path;
use std::process::Command;

#[cfg(target_os = "windows")]
const TARGET_TRIPLE: &str = "x86_64-pc-windows-msvc";
#[cfg(target_os = "linux")]
const TARGET_TRIPLE: &str = "x86_64-unknown-linux-gnu";

#[tauri::command]
pub async fn process_excel_file(file_path: String) -> Result<String, String> {
    // Verify file exists and has correct extension
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("File does not exist".into());
    }
    if path.extension().and_then(|ext| ext.to_str()) != Some("xlsx") {
        return Err("File must be an XLSX file".into());
    }

    // Path to the executable
    #[cfg(target_os = "windows")]
    let executable_name = "back.exe";
    #[cfg(not(target_os = "windows"))]
    let executable_name = "back";

    let executable_path = concat!(env!("CARGO_MANIFEST_DIR"), "/binaries/");
    let executable = format!("{}{}/{}", executable_path, TARGET_TRIPLE, executable_name);

    println!("Trying to execute: {}", executable); // Debug print

    // Execute the compiled program with the file path as argument
    let output = Command::new(&executable)
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
