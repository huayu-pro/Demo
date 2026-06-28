import sys

with open('index.html', 'r', encoding='utf-8') as f:
    original = f.read()

with open('new_sidebar.html', 'r', encoding='utf-8') as f:
    new_sidebar = f.read()

start_marker = '<div class="sidebar-header">'
end_marker = '<div class="terminal-logs">'

start_idx = original.find(start_marker)
end_idx = original.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print("Could not find markers!")
    sys.exit(1)

new_content = original[:start_idx] + new_sidebar + '\n            ' + original[end_idx:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Replacement successful.")
