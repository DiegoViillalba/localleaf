use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::AppHandle;
use tokio::process::Command;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommitInfo {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitStatusResult {
    pub has_changes: bool,
    pub has_conflicts: bool,
    pub conflicted_files: Vec<String>,
}

async fn run_git_sidecar(
    _app: &AppHandle,
    args: &[&str],
    cwd: &str,
) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .await
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if output.status.success() {
        Ok(stdout)
    } else {
        // Some commands like `git diff --quiet` return 1 when there are differences,
        // which is not strictly an error for us but a status code. 
        // We will handle specific exit codes in the calling functions if needed.
        Err(stderr.trim().to_string())
    }
}

// Special runner for status codes where exit code 1 is expected
async fn run_git_sidecar_status(
    _app: &AppHandle,
    args: &[&str],
    cwd: &str,
) -> Result<(i32, String, String), String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .await
        .map_err(|e| format!("Failed to execute git: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    Ok((output.status.code().unwrap_or(-1), stdout, stderr))
}

#[tauri::command]
pub async fn git_init(app: AppHandle, workspace: String) -> Result<(), String> {
    let git_dir = PathBuf::from(&workspace).join(".git");
    if !git_dir.exists() {
        run_git_sidecar(&app, &["init"], &workspace).await?;
        // Set up initial config if necessary (like default branch)
        run_git_sidecar(&app, &["config", "user.name", "LocalLeaf Editor"], &workspace).await.ok();
        run_git_sidecar(&app, &["config", "user.email", "auto@localleaf.local"], &workspace).await.ok();
    }
    Ok(())
}

#[tauri::command]
pub async fn git_status(app: AppHandle, workspace: String) -> Result<GitStatusResult, String> {
    // Check for conflicts
    let (code, stdout, _stderr) = run_git_sidecar_status(&app, &["status", "--porcelain"], &workspace).await?;
    if code != 0 && code != 1 {
        // Wait, git status returns 0 usually.
    }
    
    let mut has_changes = false;
    let mut has_conflicts = false;
    let mut conflicted_files = Vec::new();

    for line in stdout.lines() {
        if line.is_empty() {
            continue;
        }
        has_changes = true;
        let prefix = &line[0..2];
        let file = line[3..].to_string();
        
        // Unmerged paths have prefix "DD", "AU", "UD", "UA", "DU", "AA", "UU"
        if prefix == "DD" || prefix == "AU" || prefix == "UD" || prefix == "UA" || prefix == "DU" || prefix == "AA" || prefix == "UU" {
            has_conflicts = true;
            conflicted_files.push(file);
        }
    }

    Ok(GitStatusResult {
        has_changes,
        has_conflicts,
        conflicted_files,
    })
}

#[tauri::command]
pub async fn git_commit(app: AppHandle, workspace: String, message: String) -> Result<(), String> {
    // Stage all changes
    run_git_sidecar(&app, &["add", "."], &workspace).await?;
    
    // Check if there are staged changes to commit
    let (code, _, _) = run_git_sidecar_status(&app, &["diff", "--cached", "--quiet"], &workspace).await?;
    
    // code 1 means there ARE differences (changes exist)
    if code == 1 {
        run_git_sidecar(&app, &["commit", "-m", &message], &workspace).await?;
    }
    
    Ok(())
}

#[tauri::command]
pub async fn git_log(app: AppHandle, workspace: String) -> Result<Vec<GitCommitInfo>, String> {
    // Format: hash|author|date|message
    let format = "--format=%H|%an|%ad|%s";
    let output = run_git_sidecar(&app, &["log", format, "--date=iso", "-n", "50"], &workspace).await;
    
    let mut commits = Vec::new();
    if let Ok(stdout) = output {
        for line in stdout.lines() {
            let parts: Vec<&str> = line.splitn(4, '|').collect();
            if parts.len() == 4 {
                commits.push(GitCommitInfo {
                    hash: parts[0].to_string(),
                    author: parts[1].to_string(),
                    date: parts[2].to_string(),
                    message: parts[3].to_string(),
                });
            }
        }
    }
    Ok(commits)
}

#[tauri::command]
pub async fn git_get_diff(app: AppHandle, workspace: String, file_path: String, commit_hash: Option<String>) -> Result<String, String> {
    if let Some(hash) = commit_hash {
        // Diff between working tree and specific commit
        let (code, stdout, stderr) = run_git_sidecar_status(&app, &["show", &format!("{}:{}", hash, file_path)], &workspace).await?;
        if code == 0 {
            Ok(stdout)
        } else {
            Err(stderr)
        }
    } else {
        // Just return the content from HEAD
        let (code, stdout, stderr) = run_git_sidecar_status(&app, &["show", &format!("HEAD:{}", file_path)], &workspace).await?;
        if code == 0 {
            Ok(stdout)
        } else {
            Err(stderr)
        }
    }
}

#[tauri::command]
pub async fn git_pull(app: AppHandle, workspace: String, url: String, pat: String) -> Result<String, String> {
    let auth_url = if !pat.is_empty() && url.starts_with("https://") {
        url.replacen("https://", &format!("https://{}@", pat), 1)
    } else {
        url.clone()
    };

    // We use pull --no-rebase so we can capture merge conflicts normally
    let (code, stdout, stderr) = run_git_sidecar_status(&app, &["pull", &auth_url, "main", "--no-rebase"], &workspace).await?;
    
    if code != 0 {
        // If there are merge conflicts, git returns exit code 1
        if stderr.contains("CONFLICT") || stdout.contains("CONFLICT") {
            return Err("CONFLICT".to_string());
        }
        return Err(stderr);
    }
    
    Ok(stdout)
}

#[tauri::command]
pub async fn git_push(app: AppHandle, workspace: String, url: String, pat: String) -> Result<String, String> {
    let auth_url = if !pat.is_empty() && url.starts_with("https://") {
        url.replacen("https://", &format!("https://{}@", pat), 1)
    } else {
        url.clone()
    };

    let (code, stdout, stderr) = run_git_sidecar_status(&app, &["push", &auth_url, "HEAD:refs/heads/main"], &workspace).await?;
    
    if code != 0 {
        return Err(stderr);
    }
    
    Ok(stdout)
}

#[tauri::command]
pub async fn git_resolve_conflict(app: AppHandle, workspace: String, file_path: String, resolution: String) -> Result<(), String> {
    // resolution: "ours" or "theirs"
    if resolution == "ours" {
        run_git_sidecar(&app, &["checkout", "--ours", &file_path], &workspace).await?;
    } else if resolution == "theirs" {
        run_git_sidecar(&app, &["checkout", "--theirs", &file_path], &workspace).await?;
    } else {
        return Err("Invalid resolution strategy".to_string());
    }
    
    run_git_sidecar(&app, &["add", &file_path], &workspace).await?;
    
    // Try to commit the merge if all conflicts are resolved
    let status = git_status(app.clone(), workspace.clone()).await?;
    if !status.has_conflicts {
        run_git_sidecar(&app, &["commit", "--no-edit"], &workspace).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn git_restore_file(app: AppHandle, workspace: String, file_path: String, commit_hash: String) -> Result<(), String> {
    run_git_sidecar(&app, &["checkout", &commit_hash, "--", &file_path], &workspace).await?;
    // Automatically commit the restored file
    run_git_sidecar(&app, &["commit", "-m", &format!("Restaurada versión de {} desde {}", file_path, commit_hash)], &workspace).await?;
    Ok(())
}
