
import http from 'http';

const CONFIG = {
    HOST: '180.93.3.41',
    PORT: 8080,
    TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    PROJECT_ID: 'p2dcvsdjjw3hbe1' // From previous context or config
};

const request = (path) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.HOST,
            port: CONFIG.PORT,
            path: path,
            method: 'GET',
            headers: {
                'xc-token': CONFIG.TOKEN,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
};

const run = async () => {
    console.log('Fetching projects...');
    try {
        const projects = await request('/api/v1/db/meta/projects/');
        if (projects.list && projects.list.length > 0) {
            console.log('Projects found:');
            projects.list.forEach(p => {
                console.log(`- ${p.title} (ID: ${p.id})`);
            });

            const projectId = projects.list[0].id;
            console.log(`\nFetching tables for project: ${projectId}...`);
            const tables = await request(`/api/v1/db/meta/projects/${projectId}/tables`);

            if (tables.list) {
                console.log('Tables found:');
                tables.list.forEach(t => {
                    console.log(`- ${t.title} (ID: ${t.id})`);
                });
            } else {
                console.log('Tables Response:', JSON.stringify(tables, null, 2));
            }
        } else {
            console.log('No projects found or error:', JSON.stringify(projects, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
};

run();
