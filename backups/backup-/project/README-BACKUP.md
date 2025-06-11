# Gas Cylinder App - Daily Backup System

This project includes an automated daily backup system to protect your work and ensure you can recover from any issues.

## Backup Features

- **Daily backups** with date-stamped folders
- **Automatic cleanup** of backups older than 30 days
- **Excludes unnecessary files** (node_modules, .git, etc.)
- **Detailed backup logs** and summaries
- **Easy manual execution**

## How to Use

### Manual Backup

1. **Using PowerShell:**
   ```powershell
   .\backup.ps1
   ```

2. **Using Batch File:**
   ```cmd
   backup.bat
   ```

3. **With custom backup path:**
   ```powershell
   .\backup.ps1 -BackupPath "C:\MyBackups"
   ```

### Automated Daily Backup

#### Option 1: Windows Task Scheduler

1. Open **Task Scheduler** (search in Start menu)
2. Click **"Create Basic Task"**
3. Name: `Gas Cylinder App Daily Backup`
4. Trigger: **Daily** at your preferred time
5. Action: **Start a program**
6. Program: `powershell.exe`
7. Arguments: `-ExecutionPolicy Bypass -File "C:\gas-cylinder-app\backup.ps1"`
8. Start in: `C:\gas-cylinder-app`

#### Option 2: Windows Startup Script

1. Press `Win + R`, type `shell:startup`
2. Create a shortcut to `backup.bat` in the startup folder
3. The backup will run every time you start your computer

## Backup Structure

```
backups/
├── gas-cylinder-app-2024-01-15/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── backup.log
│   └── backup-summary.txt
├── gas-cylinder-app-2024-01-16/
│   └── ...
└── gas-cylinder-app-2024-01-17/
    └── ...
```

## What Gets Backed Up

### Included:
- ✅ Source code (`src/`)
- ✅ Public assets (`public/`)
- ✅ Configuration files (`package.json`, `vite.config.js`, etc.)
- ✅ Documentation
- ✅ Supabase configuration

### Excluded:
- ❌ `node_modules/` (can be reinstalled)
- ❌ `.git/` (version control)
- ❌ `backups/` (avoid recursion)
- ❌ `dist/` and `build/` (generated files)
- ❌ IDE files (`.vscode/`, `.idea/`)
- ❌ Log files and temporary files
- ❌ Environment files (`.env.local`, `.env.production`)

## Restoring from Backup

1. **Stop your development server**
2. **Copy the backup folder** to your project directory
3. **Rename it** to your project name (e.g., `gas-cylinder-app`)
4. **Run `npm install`** to reinstall dependencies
5. **Start your development server** with `npm run dev`

## Backup Logs

Each backup includes:
- **`backup.log`**: Detailed robocopy log
- **`backup-summary.txt`**: Human-readable summary

## Troubleshooting

### Permission Issues
- Run PowerShell as Administrator
- Check folder permissions

### Backup Fails
- Ensure you have enough disk space
- Check the backup.log file for errors
- Verify the source path is correct

### Old Backups Not Cleaning Up
- The script keeps the last 30 days
- Manual cleanup: Delete folders older than 30 days

## Customization

### Change Backup Retention
Edit `backup.ps1` and modify this line:
```powershell
Select-Object -Skip 30  # Change 30 to your preferred number of days
```

### Add/Remove Excluded Items
Edit the `$ExcludeItems` array in `backup.ps1`:
```powershell
$ExcludeItems = @(
    "node_modules",
    ".git",
    "backups",
    # Add or remove items here
)
```

### Change Backup Location
Run with custom path:
```powershell
.\backup.ps1 -BackupPath "D:\MyBackups"
```

## Security Notes

- Backups are stored locally on your machine
- Consider encrypting sensitive backups
- Don't commit backup folders to version control
- Keep backups in a separate location for disaster recovery

---

**Last Updated:** $(Get-Date -Format "yyyy-MM-dd") 