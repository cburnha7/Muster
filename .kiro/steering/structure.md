# Project Structure

This document defines the organization and folder structure conventions for the project.

## Root Directory
```
/
├── .kiro/                 # Kiro configuration and steering files
│   └── steering/          # AI assistant guidance documents
├── src/                   # Source code (update based on project type)
├── tests/                 # Test files
├── docs/                  # Documentation
├── config/                # Configuration files
└── README.md              # Project overview and setup instructions
```

## Folder Conventions
- **src/**: Main application source code
- **tests/**: Unit tests, integration tests, and test utilities
- **docs/**: Project documentation, API docs, architecture diagrams
- **config/**: Environment-specific configuration files
- **.kiro/**: Kiro AI assistant configuration (do not modify without understanding)

## File Naming Conventions
- Use kebab-case for file names: `user-service.js`
- Use PascalCase for class/component files: `UserService.js`
- Use lowercase for directories: `components/`, `utils/`
- Test files should follow pattern: `*.test.js` or `*.spec.js`

## Code Organization
- Group related functionality into modules/packages
- Keep files focused on single responsibility
- Use index files for clean imports
- Separate business logic from presentation logic

## Configuration Files
- Keep environment-specific configs in `config/` directory
- Use `.env` files for environment variables
- Document all configuration options

## Documentation
- Maintain README.md with setup and usage instructions
- Document APIs and interfaces
- Include architecture decisions and patterns
- Keep inline code comments focused and meaningful