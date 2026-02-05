#!/bin/bash
# Shell Example - Pipe & Redirect Focus

# Function declaration → DECLARATION layer
function process_logs() {
    local log_file="$1"  # Local variable → MUTATION
    local pattern="${2:-ERROR}"  # Parameter expansion → USAGE
    
    # Pipe operators → CONTROL FLOW
    cat "$log_file" | grep "$pattern" | wc -l
}

# Variable expansion → USAGE
export PATH="$PATH:$HOME/bin"  # Export → MUTATION

# Command substitution → CONTROL FLOW
current_date=$(date +%Y-%m-%d)
users=`who | wc -l`

# Redirect operators → CONTROL FLOW
echo "Log started at $current_date" > logfile.txt
process_logs app.log 2>&1 >> output.txt

# Conditional logic → CONTROL FLOW
if [[ -f config.sh ]]; then
    source config.sh  # Source → CONTROL FLOW
elif [[ -n "$CONFIG_PATH" ]]; then
    . "$CONFIG_PATH"
fi

# Test expressions → CONTROL FLOW
[ -z "$VAR" ] && echo "Variable is empty"

# Logical operators → CONTROL FLOW
command1 && command2 || fallback_command

# Here-document → DATA layer
cat <<EOF
This is a multi-line
heredoc string with
$variable expansion
EOF

# Special variables → USAGE (builtin)
echo "Exit code: $?"
echo "PID: $$"
echo "Args: $@"

# Process substitution → CONTROL FLOW
diff <(sort file1.txt) <(sort file2.txt)

# Glob patterns → DATA
for file in *.log; do
    echo "Processing $file"
done
