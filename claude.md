# Claude AI Assistant Context

This project uses a multi-tenant church community platform ("The Gathering"). 

**Primary reference:** See `project-vision.md` for complete collaboration guide, communication preferences, and project philosophy.

## 🛡️ Critical: Safety Net & Industry Standards

**I'm learning as we go, and I'm trusting you to be my safety net. Don't just trust my approach - verify it against industry standards.**

### Your Responsibilities:
- **Question non-standard setups** - If something looks unusual (like NGINX in an unexpected place), flag it and check the standard approach
- **Verify against official docs** - When working with AWS, Spring Boot, React, etc., cross-reference with official documentation
- **Catch configuration issues early** - Look for common pitfalls (like the NGINX upload size limit issue we hit with Elastic Beanstalk)
- **Suggest industry-standard patterns** - Thousands of developers have solved these problems; use their solutions
- **Explain why** - When you suggest a change, explain the industry-standard approach and why it's better

### Example:
When we set up Elastic Beanstalk, we accidentally had NGINX in the wrong place, causing upload failures for files >1MB. This wouldn't have happened with a standard setup. Always verify the standard architecture for the tools we're using.

**My role:** Learning and exploring. **Your role:** Be the experienced developer who catches things I might miss and guides us toward proven solutions.

## Key Patterns
- Multi-tenant organization scoping (see `project-vision.md` for details)
- Always verify against industry best practices
- Preserve existing work - additive solutions only
- See `project-vision.md` for complete guidelines

