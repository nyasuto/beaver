# System Commands (Darwin/macOS)

## File Operations
```bash
ls -la              # List files with details
find . -name "*.ts" # Find TypeScript files
grep -r "pattern"   # Search in files (though prefer using Serena's search tools)
cat filename        # Display file contents (though prefer using Read tool)
head -n 20 file     # Show first 20 lines
tail -f file        # Follow file changes
```

## Directory Navigation
```bash
pwd                 # Print working directory
cd path/to/dir      # Change directory
mkdir dirname       # Create directory
rmdir dirname       # Remove empty directory
rm -rf dirname      # Remove directory and contents (use carefully)
```

## Git Commands
```bash
git status          # Check repository status
git branch          # List branches
git checkout -b branch-name  # Create and switch to new branch
git add .           # Stage all changes
git commit -m "message"      # Commit changes
git push origin branch-name  # Push to remote
git pull origin main         # Pull latest changes
git log --oneline            # View commit history
```

## Process Management
```bash
ps aux              # List running processes
kill -9 PID         # Force kill process
pkill process-name  # Kill process by name
lsof -i :3000       # Check what's using port 3000
```

## System Information
```bash
uname -a            # System information
which node          # Find Node.js location
node --version      # Check Node.js version
npm --version       # Check npm version
```

## Network
```bash
curl -I url         # Check HTTP headers
ping hostname       # Test connectivity
netstat -an         # Network connections
```

## File Permissions
```bash
chmod +x file       # Make file executable
chmod 644 file      # Set read/write for owner, read for others
chown user:group file # Change ownership
```

## Archives
```bash
tar -czf archive.tar.gz folder/  # Create compressed archive
tar -xzf archive.tar.gz          # Extract compressed archive
zip -r archive.zip folder/       # Create zip archive
unzip archive.zip                # Extract zip archive
```

## Homebrew (Package Manager)
```bash
brew install package  # Install package
brew update           # Update Homebrew
brew upgrade          # Upgrade all packages
brew list             # List installed packages
```