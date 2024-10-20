import { OPENAI_API } from '$env/static/private';


export async function POST({request}) {
    const {values} = await request.json(); 
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant  that returns valid json data with a field like name of necessary information from given conversation between doctor and patient if conversation is not related to medical you return null.Do not assume anything.' },
                    { role: 'user', content: `This is conversation between doctor and patient '${values}' If conversation is not related to medial question answering return null else return json data with all necessary information.` }
                ],
                max_tokens: 1024,
                n: 1,
                temperature: 0.2
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        let report = data.choices[0].message.content.trim();
        const pattern = /(```json)([\s\S]*?)(```)/;
        const match = report.match(pattern);
        if (match) {
            report=match[2];
        }
        
        return new Response(JSON.stringify({ report }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.log(error)
        return new Response(JSON.stringify({ error: 'Error fetching Mermaid code' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
