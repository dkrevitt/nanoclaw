# Project & Topic Skills

Create, update, and view projects and topics.

## Available Skills

| Skill | Description |
|-------|-------------|
| [/list-projects](projects/list-projects.md) | List all projects |
| [/create-project](projects/create-project.md) | Create a new project |
| [/update-project](projects/update-project.md) | Update project settings, review criteria, pitch angles |
| [/get-topic](projects/get-topic.md) | Get topic details with criteria |
| [/create-topic](projects/create-topic.md) | Create a new topic |
| [/update-topic](projects/update-topic.md) | Update topic name, description, review criteria |

## Quick Reference

### Projects

```bash
# List all projects
/list-projects

# Create a project
/create-project --name "Acme Launch" --description "Creator outreach for Acme"

# Update project review criteria
/update-project proj-123 --review-criteria '{
  "must_have": ["10k+ followers", "Posts weekly"],
  "nice_to_have": ["Verified account"],
  "exclude_if": ["Promotional content only"]
}'

# Update pitch angles
/update-project proj-123 --pitch-angles '{
  "angles": [{"id": "review", "name": "Product Review", ...}]
}'
```

### Topics

```bash
# Get topic details
/get-topic <topic-id>

# Create a topic
/create-topic --project-id proj-123 --name "AI coding tutorials"

# Update topic review criteria
/update-topic topic-456 --review-criteria '{
  "must_have": ["Creates coding content"],
  "exclude_if": ["Only beginner tutorials"]
}'
```

## Project Structure

```
Project
├── Settings
│   ├── Review Criteria (project-wide)
│   ├── Pitch Angles (email templates)
│   ├── Gmail Account (for sending)
│   └── Sheets Config (for export)
└── Topics (1..n)
    ├── Review Criteria (topic-specific)
    └── Saved Searches (platform + query pairs)
```

## Review Criteria Format

Criteria are stored as JSONB and combined hierarchically:
1. **Global baseline** (hardcoded): 1k+ followers, English, US/Europe, etc.
2. **Project criteria**: Apply to all topics
3. **Topic criteria**: Specific to one topic

```json
{
  "must_have": [
    "Posts video content primarily",
    "Posts at least weekly"
  ],
  "nice_to_have": [
    "Verified account",
    "Engagement rate > 5%"
  ],
  "exclude_if": [
    "Primarily promotional content"
  ]
}
```

## Pitch Angles Format

```json
{
  "angles": [
    {
      "id": "product-review",
      "name": "Product Review Request",
      "subject_template": "Quick question about {{product}}",
      "body_template": "Hi {{creator_name}},\n\n...",
      "best_for": ["youtube", "tiktok"],
      "generation_mode": "dynamic"
    }
  ]
}
```

## Typical Workflows

### Setup a new project
1. `/create-project --name "Project Name"`
2. `/update-project <id> --review-criteria '{...}'`
3. `/update-project <id> --pitch-angles '{...}'`
4. Connect Gmail via Chrome extension

### Setup a new topic
1. `/create-topic --project-id <id> --name "Topic Name"`
2. `/update-topic <id> --review-criteria '{...}'`
3. `/create-saved-search --topic-id <id> --platform youtube --query "search term"`
4. `/discover-creators --topic-id <id>`
