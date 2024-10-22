export const config = {
	maxDuration: 60,
  };
import { AI_API } from '$env/static/private';
/** @type {import('./$types').RequestHandler} */

function build_prompt(messages){
	messages.pop()
	let DEFAULT_IMAGE_TOKEN = "<image>"
    let pr="System:\nYou are a Health Education Assistant who provides simplified information purely for educational purposes and avoids giving treatment or medical advice.\n\n"
	let images=[]
	for(let i=0;i<messages.length;i++){
		if(messages[i].text){
			pr+=`${messages[i].text}\n\n`
		}else if(messages[i].image){
			pr=`${DEFAULT_IMAGE_TOKEN}\n`
			images=[]
			images.push(messages[i].image)

		}
	}
	pr+="Assistant:\n"
	return {pr,images}
}
export async function POST({ request }) {
    try {
        const { messages} = await request.json();
        let {pr,images}=build_prompt(messages)
		
        const data = {
            prompt: pr,
			images:images,
 			"stop":"\n\n",
			"temperature": 0.2,
			"top_p": 0.9,
			"max_new_tokens": 1024,
        };

        const response = await fetch(AI_API, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const headers = new Headers(response.headers);

        const textStream = new ReadableStream({
            start(controller) {
                const reader = response.body.getReader();

                async function forwardResponse() {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) {
                                try{
                                controller.close();
                                }catch{}
                                return;
                            }
                            controller.enqueue(value);
                        }
                    } catch (error) {
                        console.error('Error reading response:', error);
                        controller.error(error);
                    }
                }

                forwardResponse();
            }
        });

        return new Response(textStream, {
            status: response.status,
            statusText: response.statusText,
            headers: headers
        });

    } catch (error) {
        console.error('Error occurred:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}