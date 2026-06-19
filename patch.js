const fs = require('fs');
let code = fs.readFileSync('src/components/admin/pages/EventDetailPage.tsx', 'utf8');
code = code.replace(/content: {\s*\.\.\.\(eventData\?\.content \|\| \{\}\),\s*\.\.\.homeContent\s*}/g, `content: {
            ...((typeof eventData?.content === 'object' && eventData?.content !== null) ? eventData.content : {}),
            ...homeContent
          }`);
code = code.replace(/content: {\s*\.\.\.\(eventData\.content \|\| \{\}\),\s*\.\.\.homeContent,\s*allowBulkNoOtp: eventData\.content\?\.allowBulkNoOtp\s*}/g, `content: {
                        ...((typeof eventData?.content === 'object' && eventData?.content !== null) ? eventData.content : {}),
                        ...homeContent,
                        allowBulkNoOtp: eventData?.content?.allowBulkNoOtp || false
                      }`);
fs.writeFileSync('src/components/admin/pages/EventDetailPage.tsx', code);
