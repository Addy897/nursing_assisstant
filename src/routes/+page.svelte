<script>
	// Environment
	import { onMount } from 'svelte';
	//

	//Auth
	import { getAuth } from 'firebase/auth';
	import { getApps, initializeApp } from 'firebase/app';
	import { firebaseConfig } from '$lib/firebase_config';
	import { doc, setDoc, getFirestore, getDoc } from 'firebase/firestore';
	import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
	//

	//UI
	import {
		Card,
		SpeedDial,
		SpeedDialButton,
	} from 'flowbite-svelte';
	import icon from '$lib/images/icon.png';
	import robot from '$lib/images/robot.svg';
	import GetLink from '$lib/components/getLink.svelte';
	import { ThumbsUpSolid,ThumbsDownSolid } from 'flowbite-svelte-icons';
	//

	//Store
	import { loginStore, selectedChats, allChats } from '../stores/loginstore';
	import destr from 'destr';
	import { marked } from 'marked';
	//

	let fApp = null;
	let user = null;
	let img_uuid = null;
	let messages = [];
	let image_link;
	let inputValue = '';
	let previousChats = {};
	let imageLink = null;
	let formModal = false;
	let liked =null
	let uid=null
	selectedChats.subscribe((chats) => {
		messages = chats || [];
		if(messages.length===0){
			if (user) {
				img_uuid = `${user.uid}.${makeid(5)}`;
			}
		}
	});
	$: if (previousChats) {
		allChats.update((m) => {
			return previousChats;
		});
	}
	
	onMount(() => {
		if (!getApps().length) {
			fApp = initializeApp(firebaseConfig, {
				experimentalForceLongPolling: true,
				useFetchStreams: false
			});
		} else {
			fApp = getApps()[0];
		}
		getAuth().onAuthStateChanged(async (currentUser) => {
			user = currentUser;
			if (user) {
				localStorage.setItem('user', JSON.stringify(user));
				uid=user.uid
				const db = getFirestore(fApp);
				const docRef = doc(db, 'chats', user.uid);
				const docSnap = await getDoc(docRef);				
				if (docSnap.exists()) {
					previousChats = docSnap.data().allChats || {};
				}
				loginStore.set({ userName: user.displayName, photoURL: user.photoURL });
			} 
		});

		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			user = JSON.parse(storedUser);
			img_uuid = `${user.uid}.${makeid(5)}`;
		}
	});
	function like(cont){

		messages[messages.length-1].liked=cont
		previousChats=saveChat(previousChats)
	}
	async function query(index) {
		try {
			const data = {
				messages: messages,
				image_link: image_link
			};
			const response = await fetch('/query', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
			}
			const reader = response.body.getReader();
			let chunk;
			while (!(chunk = await reader.read()).done) {
			const textChunks = new TextDecoder().decode(chunk.value).split("\0");
			for(let i=0;i<textChunks.length;i++){
				try{
					let textChunk=textChunks[i]
					if (textChunk) {
						let data={};
						try{
						 data = destr(textChunk.trim());
						}catch{
							data=JSON.parse(textChunk.trim())
						}
						if (data.error_code === 0) {
						
						const output = data.text.trim();

						messages[index].text = output;
						
						} else {
						const output = data.text + ` (error_code: ${data.error_code})`;

						messages[index].text = output;
						}
					}
					await new Promise((resolve) => setTimeout(resolve, 30));
				}catch(e){
					console.log(e,textChunks)
				}
			}
    }
		} catch (error) {
			console.error('Error occurred:', error);
			return 'Internal Server Error';
		}
	}
	async function sendMessage() {
		if (inputValue.trim() !== '') {
			messages = [...messages, { text: inputValue, isUser: true,timeStamp:new Date().toString()}];
			inputValue = '';
			messages = [...messages, { text: "...", isUser: false,timeStamp:new Date().toString(),liked:liked }];
			await query(messages.length-1);
			previousChats = saveChat(previousChats);
		}
	}

	function saveChat(previousChats) {
		if (messages.length > 0) {
			let title = messages[0].text;
			let i = 0;
			while (!title && i < messages.length) {
				i += 1;
				title = messages[i].text;
			}
			previousChats[title] = { messages: messages };
		}
		const db = getFirestore(fApp);

		setDoc(doc(db, 'chats', user.uid), { allChats: previousChats });
		return previousChats;
	}
	function handleFileUpload(event) {
		const file = event.target.files[0];
		if (file) {
			const storage = getStorage();
			const storageRef = ref(storage, img_uuid);
			const imageURL = URL.createObjectURL(file);
			messages = [...messages, { image: imageURL, isUser: true }];
			let i = messages.length - 1;
			uploadBytes(storageRef, file).then((snapshot) => {
				getDownloadURL(snapshot.ref).then((url) => {
					image_link = url;
					messages[i].image = image_link;
				});
			});
		}
	}
	function makeid(length) {
		let result = '';
		const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const charactersLength = characters.length;
		let counter = 0;
		while (counter < length) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
			counter += 1;
		}
		return result;
	}
	$: if (imageLink) {
		image_link = imageLink;
		messages = [...messages, { image: image_link, isUser: true }];
		imageLink = null;
	}
</script>

<div
	class="bg-light text-black flex justify-center items-center"
>
	<div class="flex flex-col w-full h-[90vh]">
		<!--Chat Section-->
		{#if messages.length > 0}
			<!--Chats-->
			<div class="flex flex-col overflow-y-auto h-full gap-4">
				{#each messages as message}
					<div class="mb-2">
						{#if message.text}
							<div
								class=" flex flex-row w-full  items-center {message.isUser
										? 'text-right justify-end mr-4 mt-6'
										: 'text-left justify-start ml-4'}"
								style="max-width: 98vw;"
							>
								{#if !message.isUser}
									<img
										src={message.isUser?$loginStore.photoURL:robot}
										class="h-6 w-6 rounded-full {!message.isUser
								? 'text-right '
								: 'text-left '}"
										alt=""
									/>
								{/if}
								<div class="flex flex-col">
									<div
										class="p-3 rounded-3xl bg-[#CDE6EA] text-black text-sm text-wrap break-words overflow-hidden font-semibold font-sans">{@html marked(message.text)}</div>
									{#if !message.isUser && message.text!=="..." && messages.indexOf(message)===messages.length-1 && message.liked===null}
										<div class="flex flex-row gap-5">
											<button on:click={()=>{like(true)}}
												><ThumbsUpSolid color="green" class="cursor-pointer hover:scale-125"
												></ThumbsUpSolid></button
											>
											<button on:click={()=>{like(true)}}
												><ThumbsDownSolid
													color="red"
													on:click={()=>{like(false)}}
													class="cursor-pointer hover:scale-125"
												></ThumbsDownSolid></button
											>
										</div>
									{/if}
								</div>
								{#if message.isUser}
									<img
										src={message.isUser?$loginStore.photoURL:robot}
										class="h-6 w-6 rounded-full"
										alt=""
									/>
								{/if}
							</div>
						{:else if message.image}
							<div
								class="flex {message.isUser
										? 'text-right justify-end mr-4'
										: 'text-left justify-start ml-4'}"
							>
								<img
									src={encodeURI(message.image)}
									class="max-w-xs"
									alt="uploaded_image"
									size="max-w-xs"
									referrerpolicy="no-referrer"
								/>
							</div>
						{/if}
					</div>
				{/each}
			</div>
			<!---->
		{:else}
			<!--Examples-->
			<div class="flex flex-col h-full justify-center items-center gap-2 text-center">
				<img src={icon} alt="" class="w-48" />
				{#if user}
					<div class="text-[#5786B2]">
						Welcome {user.displayName} !
					</div>
				{/if}
				<div class="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
					<Card
						class="flex flex-col justify-start bg-[#FEFFED] cursor-pointer border-black w-48"
						on:click={() => {
								inputValue = 'About Urinary Systems';
							}}
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<g clip-path="url(#clip0_238_1292)">
								<path
									d="M19 5V19H5V5H19ZM19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"
									fill="#67AD4E"
								/>
								<path d="M14 17H7V15H14V17ZM17 13H7V11H17V13ZM17 9H7V7H17V9Z" fill="#67AD4E" />
							</g>
							<defs>
								<clipPath id="clip0_238_1292">
									<rect width="24" height="24" fill="white" />
								</clipPath>
							</defs>
						</svg>

						<h5 class="mb-2 tracking-tight text-gray-900 dark:text-white font-medium">
							About Urinary Systems
						</h5>
					</Card>
					<Card
						class="flex flex-col justify-start bg-[#FFF0F0] cursor-pointer border-black w-48"
						on:click={() => {
								inputValue = 'Create notes on nursing theories';
							}}
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<g clip-path="url(#clip0_238_1293)">
								<path
									d="M21 5C19.89 4.65 18.67 4.5 17.5 4.5C15.55 4.5 13.45 4.9 12 6C10.55 4.9 8.45 4.5 6.5 4.5C4.55 4.5 2.45 4.9 1 6V20.65C1 20.9 1.25 21.15 1.5 21.15C1.6 21.15 1.65 21.1 1.75 21.1C3.1 20.45 5.05 20 6.5 20C8.45 20 10.55 20.4 12 21.5C13.35 20.65 15.8 20 17.5 20C19.15 20 20.85 20.3 22.25 21.05C22.35 21.1 22.4 21.1 22.5 21.1C22.75 21.1 23 20.85 23 20.6V6C22.4 5.55 21.75 5.25 21 5ZM21 18.5C19.9 18.15 18.7 18 17.5 18C15.8 18 13.35 18.65 12 19.5V8C13.35 7.15 15.8 6.5 17.5 6.5C18.7 6.5 19.9 6.65 21 7V18.5Z"
									fill="#D17164"
								/>
								<path
									d="M17.5 10.5C18.38 10.5 19.23 10.59 20 10.76V9.24C19.21 9.09 18.36 9 17.5 9C15.8 9 14.26 9.29 13 9.83V11.49C14.13 10.85 15.7 10.5 17.5 10.5Z"
									fill="#D17164"
								/>
								<path
									d="M13 12.4902V14.1502C14.13 13.5102 15.7 13.1602 17.5 13.1602C18.38 13.1602 19.23 13.2502 20 13.4202V11.9002C19.21 11.7502 18.36 11.6602 17.5 11.6602C15.8 11.6602 14.26 11.9602 13 12.4902Z"
									fill="#D17164"
								/>
								<path
									d="M17.5 14.3301C15.8 14.3301 14.26 14.6201 13 15.1601V16.8201C14.13 16.1801 15.7 15.8301 17.5 15.8301C18.38 15.8301 19.23 15.9201 20 16.0901V14.5701C19.21 14.4101 18.36 14.3301 17.5 14.3301Z"
									fill="#D17164"
								/>
							</g>
							<defs>
								<clipPath id="clip0_238_1293">
									<rect width="24" height="24" fill="white" />
								</clipPath>
							</defs>
						</svg>

						<h5 class="mb-2 tracking-tight text-gray-900 dark:text-white font-medium">
							Create notes on nursing theories
						</h5>
					</Card>
					<Card
						class=" hidden md:flex flex-col justify-start bg-[#F5FFF2] cursor-pointer border-black w-48"
						on:click={() => {
								inputValue = 'Pathophysiology main concepts?';
							}}
					>
						<svg
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<g clip-path="url(#clip0_238_1294)">
								<path
									d="M3.84004 4H19.2V16H4.96324L3.84004 17.17V4ZM3.84004 2C2.78404 2 1.92964 2.9 1.92964 4L1.92004 22L5.76004 18H19.2C20.256 18 21.12 17.1 21.12 16V4C21.12 2.9 20.256 2 19.2 2H3.84004ZM5.76004 12H17.28V14H5.76004V12ZM5.76004 9H17.28V11H5.76004V9ZM5.76004 6H17.28V8H5.76004V6Z"
									fill="#D5CC2A"
								/>
							</g>
							<defs>
								<clipPath id="clip0_238_1294">
									<rect width="23.04" height="24" fill="white" />
								</clipPath>
							</defs>
						</svg>

						<h5 class="mb-2 tracking-tight text-gray-900 dark:text-white font-medium">
							Pathophysiology main concepts?
						</h5>
					</Card>
					<Card
						class=" hidden md:flex w- flex-col justify-start bg-[#FEFFED] cursor-pointer border-black w-48"
						on:click={() => {
								inputValue = 'Classify diseases anatomicaly';
							}}
					>
						<svg width="24" height="24" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
							<!-- Define the clip path to match the viewBox dimensions -->
							<defs>
								<clipPath id="clip-path">
									<rect width="36" height="36" fill="none" />
								</clipPath>
							</defs>

							<!-- Camera icon paths with green fill -->
							<path
								clip-path="url(#clip-path)"
								d="M16,10.001c-4.419,0-8,3.581-8,8c0,4.418,3.581,8,8,8c4.418,0,8-3.582,8-8C24,13.583,20.418,10.001,16,10.001z M20.555,21.906c-2.156,2.516-5.943,2.807-8.459,0.65c-2.517-2.156-2.807-5.944-0.65-8.459c2.155-2.517,5.943-2.807,8.459-0.65C22.42,15.602,22.711,19.391,20.555,21.906z"
								fill="green"
							/>
							<path
								clip-path="url(#clip-path)"
								d="M16,14.001c-2.209,0-3.999,1.791-4,3.999v0.002c0,0.275,0.224,0.5,0.5,0.5s0.5-0.225,0.5-0.5V18c0.001-1.656,1.343-2.999,3-2.999c0.276,0,0.5-0.224,0.5-0.5S16.276,14.001,16,14.001z"
								fill="green"
							/>
							<path
								clip-path="url(#clip-path)"
								d="M29.492,9.042l-4.334-0.723l-1.373-3.434C23.326,3.74,22.232,3,21,3H11C9.768,3,8.674,3.74,8.214,4.886L6.842,8.319L2.509,9.042C1.055,9.283,0,10.527,0,12v15c0,1.654,1.346,3,3,3h26c1.654,0,3-1.346,3-3V12C32,10.527,30.945,9.283,29.492,9.042z M30,27c0,0.553-0.447,1-1,1H3c-0.553,0-1-0.447-1-1V12c0-0.489,0.354-0.906,0.836-0.986l5.444-0.907l1.791-4.478C10.224,5.25,10.591,5,11,5h10c0.408,0,0.775,0.249,0.928,0.629l1.791,4.478l5.445,0.907C29.646,11.094,30,11.511,30,12V27z"
								fill="green"
							/>
						</svg>

						<h5 class="mb-2 tracking-tight text-gray-900 dark:text-white font-medium">
							Classify diseases anatomicaly
						</h5>
					</Card>
					<Card
						class="flex flex-col justify-start bg-[#FFF0F0] cursor-pointer border-black w-48"
						on:click={() => {
								inputValue = 'Generate notes on respiratory system';
							}}
					>
						<svg height="28" viewBox="0 0 24 24" width="28" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M8.997 6.968H6.708V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v5.923a1 1 0 0 0 .966 1l1.937.061v7.404a.549.549 0 0 0 1.053.216l3.96-9.242a1 1 0 0 0-.92-1.394zM8.708 3v1.968h.289a3 3 0 0 1 2.757 4.181l-3.96 9.243a2.549 2.549 0 0 1-4.891-1.004v-5.466A3 3 0 0 1 0 8.923V3a3 3 0 0 1 3-3h2.708a3 3 0 0 1 3 3z"
								fill="#D17164"
							/>
						</svg>

						<h5 class="mb-2 tracking-tight text-gray-900 dark:text-white font-medium">
							Generate notes on respiratory system
						</h5>
					</Card>
					<Card
						class="flex flex-col justify-start bg-[#F5FFF2] cursor-pointer border-black w-48"
						on:click={() => {
								inputValue = 'Simplify medical terms';
							}}
					>
						<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
							<path
								d="M 5 5 L 5 27 L 27 27 L 27 5 Z M 7 7 L 25 7 L 25 25 L 7 25 Z M 11 10 L 11 22 L 13 22 L 13 17 L 19 17 L 19 22 L 21 22 L 21 10 L 19 10 L 19 15 L 13 15 L 13 10 Z"
								fill="#D5CC2A"
							/>
						</svg>

						<h5 class="mb-2 tracking-tight text-gray-900 dark:text-white font-medium">
							Simplify medical terms
						</h5>
					</Card>
				</div>
				<p class="text-gray-500 font-medium">
					Disclaimer: This AI Engine for Medical Learning and Healthcare Educational Purposes Only
				</p>
			</div>
			<!---->
		{/if}
		<!--Input-->
		<div class="flex flex-col justify-center items-center gap-2">
			<div class=" flex flex-row w-full justify-center">
				<div class="flex w-full justify-center">
					<div class="relative w-3/4">
						<SpeedDial defaultClass="absolute top-[0.90rem] left-4" trigger="click">
							<button slot="button">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M9.85714 7.92854V13.9285C9.85714 15.112 10.8165 16.0714 12 16.0714C13.1835 16.0714 14.1429 15.112 14.1429 13.9285V7.71425C14.1429 5.46566 12.32 3.64282 10.0714 3.64282C7.82284 3.64282 6 5.46566 6 7.71425V14.3571C6 17.6708 8.68629 20.3571 12 20.3571C15.3137 20.3571 18 17.6708 18 14.3571V7.92854"
										stroke="black"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
							</button>
							<SpeedDialButton name="Upload Link" on:click={() => {
										formModal = true;
									}}>
								<svg
									width="18"
									height="20"
									viewBox="0 0 18 20"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M2.28 11.06H6.28C7.54098 11.0377 8.58266 12.0391 8.61 13.3V17.3C8.60452 18.5625 7.58246 19.5845 6.32 19.59H2.32C1.05907 19.6067 0.0219162 18.6009 0 17.34V13.34C0 12.0808 1.02079 11.06 2.28 11.06ZM6.28 18.09C6.71631 18.09 7.07 17.7363 7.07 17.3V13.3C7.07002 13.0914 6.98647 12.8915 6.83802 12.7449C6.68957 12.5983 6.4886 12.5173 6.28 12.52H2.28C2.07313 12.52 1.87474 12.6022 1.72846 12.7485C1.58218 12.8947 1.5 13.0931 1.5 13.3V17.3C1.49997 17.7324 1.84761 18.0845 2.28 18.09H6.28Z"
										fill="black"
									/>
									<path
										d="M5.62 14.57C5.3052 14.57 5.05 14.3148 5.05 14C5.05 13.5858 4.71421 13.25 4.3 13.25C3.88579 13.25 3.55 13.5858 3.55 14V14.01C3.55 14.3193 3.29928 14.57 2.99 14.57C2.57579 14.57 2.24 14.9058 2.24 15.32C2.24 15.7342 2.57579 16.07 2.99 16.07C3.3048 16.07 3.56 16.3252 3.56 16.64V16.65C3.56 17.0642 3.89579 17.4 4.31 17.4C4.72421 17.4 5.06 17.0642 5.06 16.65C5.06 16.3297 5.31968 16.07 5.64 16.07C6.05421 16.07 6.39 15.7342 6.39 15.32C6.39 14.9058 6.05421 14.57 5.64 14.57H5.62Z"
										fill="black"
									/>
									<path
										fill-rule="evenodd"
										clip-rule="evenodd"
										d="M10.04 0.22L17.04 7.22C17.1888 7.37153 17.2684 7.57779 17.26 7.79V14.79C17.26 17.4134 15.1334 19.54 12.51 19.54H9.64C9.22579 19.54 8.89 19.2042 8.89 18.79C8.89 18.3758 9.22579 18.04 9.64 18.04H12.51C14.3049 18.04 15.76 16.5849 15.76 14.79V12.54C15.76 10.3309 13.9691 8.54 11.76 8.54H11.51C9.99122 8.54 8.76 7.30878 8.76 5.79V3.78C8.76 2.53736 7.75264 1.53 6.51 1.53C4.71346 1.53551 3.25999 2.99345 3.26 4.79V9.79C3.26 10.2042 2.92421 10.54 2.51 10.54C2.09579 10.54 1.76 10.2042 1.76 9.79V4.79C1.74933 3.52331 2.24506 2.30482 3.13702 1.40535C4.02898 0.505887 5.24326 -4.49127e-05 6.51 2.99042e-09H9.51C9.70885 0.000175055 9.89948 0.0793075 10.04 0.22ZM12.495 4.795C11.6702 3.97023 10.26 4.55436 10.26 5.72077V5.79C10.2655 6.47645 10.8235 7.03002 11.51 7.03H11.5692C12.7356 7.03 13.3198 5.61977 12.495 4.795Z"
										fill="black"
									/>
								</svg>
							</SpeedDialButton>
							<SpeedDialButton name="Uplaod Image">
								<label for="profile">
									<svg
										width="24"
										height="24"
										viewBox="0 0 24 24"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M8.12 10.08C9.22457 10.08 10.12 9.18457 10.12 8.08C10.12 6.97543 9.22457 6.08 8.12 6.08C7.01543 6.08 6.12 6.97543 6.12 8.08C6.12 9.18457 7.01543 10.08 8.12 10.08Z"
											fill="black"
										/>
										<path
											fill-rule="evenodd"
											clip-rule="evenodd"
											d="M14.24 2H10C5.58172 2 2 5.58172 2 10V14.24C2 18.6583 5.58172 22.24 10 22.24H14.24C18.6583 22.24 22.24 18.6583 22.24 14.24V10C22.24 7.87827 21.3971 5.84344 19.8969 4.34315C18.3966 2.84285 16.3617 2 14.24 2ZM10 3.5H14.24C17.4859 3.50507 20.2306 5.90396 20.67 9.12H19.12C14.9468 9.1234 11.0879 11.3382 8.98 14.94C7.66362 13.8943 6.03116 13.3267 4.35 13.33H3.5V10C3.50551 6.41243 6.41243 3.50551 10 3.5ZM4.35 14.83H3.53C3.74723 17.1883 5.22988 19.2418 7.4 20.19C7.47167 18.8552 7.77274 17.5426 8.29 16.31C7.19845 15.3571 5.79895 14.8314 4.35 14.83ZM14.24 20.74H10C9.62404 20.7385 9.24906 20.7017 8.88 20.63C9.00486 15.0613 13.55 10.6095 19.12 10.6H20.74V14.24C20.7345 17.8276 17.8276 20.7345 14.24 20.74Z"
											fill="black"
										/>
									</svg>
									<input
										type="file"
										id="profile"
										accept="image/*"
										class="hidden"
										on:change={handleFileUpload}
									/>
								</label>
							</SpeedDialButton>
						</SpeedDial>
						<textarea
							class="w-full pl-12 pt-3 border border-gray-300 rounded-full h-3/4 resize-none bg-[#DEEDF3] outline-none"
							placeholder="Ask me anything..."
							bind:value={inputValue}
						/>

						<button class="absolute top-[0.90rem] right-4" on:click={sendMessage}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-6"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
			<GetLink bind:imageLink bind:formModal></GetLink>
		</div>
		<!---->
	</div>
</div>
