<script>
	import Transcription from '../Transcription/Transcription.svelte';
	import Recorder from '../Recorder/Recorder.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { patients } from '../../../stores/loginstore';
	let support = true;
	let recordingText = `Press the Play button to Start recording.`;
	let transcriptionContent = '';
	let recognition = null;
	let transcription = [];
	let patients_data={}
	
	onMount(() => {
		if (browser) {
			try {
				let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
				recognition = new SpeechRecognition();
				transcription = getAllTranscription();

				recognition.continuous = true;
				recognition.onresult = function (event) {
					let current = event.resultIndex;
					let transcript = event.results[current][0].transcript;
					transcriptionContent += transcript;
				};

				recognition.onstart = function () {
					recordingText = 'Voice recognition Started. Try speaking into the microphone.';
				};
				recognition.onspeechend = function () {
					recordingText = 'Voice recognition turned off.';
				};

				recognition.onerror = function (event) {
					if (event.error == 'no-speech') {
						recordingText = 'No Voice was detected. Try again.';
					}
				};
			} catch (e) {
				support = false;
			}
		}
	});
	
	async function saveTranscription(dateTime, content) {
		let data;
		if (browser) {
			localStorage.setItem('transcription-' + dateTime, content);
			data=JSON.parse(localStorage.getItem('patient'))||{}

		}
		const response = await fetch('/transcribe/query/', {
			method: 'POST',
			body: JSON.stringify({ values: content })
		});
		let { report } = await response.json();
		try {
			const patient_data = JSON.parse(report);
			data[patient_data.name]=patient_data
			localStorage.setItem("patient",JSON.stringify(data))
			patients.update((m) => {
			 m[patient_data.name]=patient_data;
			 return m;
		});
		} catch(e) {
			console.log(report);
			console.log(e);

		}

	}
	function getAllTranscription() {
		if (browser) {
			let key;
			for (var i = 0; i < localStorage.length; i++) {
				key = localStorage.key(i);
				console.log(key);
				if (key.substring(0, 'transcription-'.length) == 'transcription-') {
					transcription.push({
						date: key.replace('transcription-', ''),
						content: localStorage.getItem(localStorage.key(i))
					});
				}
			}
			return transcription;
		}
	}
	function deleteTranscription(event) {
		if (browser) {
			let dateTime = event.detail.dateTime;

			localStorage.removeItem('transcription-' + dateTime);
			transcription = getAllTranscription();
		}
	}
	function recorderHandler(event) {
		let type = event.detail.actionType;
		if (type === 'PLAY') {
			startHandler();
		} else if (type === 'PAUSE') {
			pauseHandler();
		} else if (type === 'RESET') {
			resetHandler();
		} else if (type === 'SAVE') {
			saveHandler();
		} else {
		}
	}
	function startHandler() {
		if (transcriptionContent.length) {
			transcriptionContent += ' ';
		}
		recognition.start();
	}
	function pauseHandler() {
		recognition.stop();
		recordingText = 'Voice recognition paused.';
	}
	function resetHandler() {
		if (browser) {
			transcriptionContent = '';
			recordingText = 'Transcription reset successfully.';
			window.setTimeout(() => {
				recordingText = `Press the Play button to Start recording.`;
			}, 5000);
		}
	}
	function saveHandler() {
		if (browser) {
			recognition.stop();

			if (!transcriptionContent.length) {
				recordingText =
					'Could not save empty transcription. Please add a message to your transcription.';
			} else {
				saveTranscription(new Date().toLocaleString(), transcriptionContent);
				transcriptionContent = '';
				transcription = getAllTranscription();
				recordingText = 'Transcription saved successfully.';
				window.setTimeout(() => {
					recordingText = `Press the Play button to Start recording.`;
				}, 5000);
			}
		}
	}
	function readOutLoudHandler(event) {
		let data = event.detail.content;
	}
</script>

{#if support}
	<Recorder on:recorderHandler={recorderHandler} />

	<div class="input-single">
		<textarea
			id="transcription-textarea"
			bind:value={transcriptionContent}
			placeholder="Create a new transcription by typing or using voice recognition."
			rows="6"
		/>
	</div>

	<p class="instructions">{recordingText}</p>
	<ul id="transcription">
		{#each transcription as transcription (transcription.date)}
			<Transcription
				{transcription}
				on:deleteHandler={deleteTranscription}
				on:readOutLoudHandler={readOutLoudHandler}
			/>
		{/each}
		{#if transcription.length === 0}
			<li class="no-transcription">
				<p>You don't have any transcription.</p>
			</li>
		{/if}
	</ul>
{:else}
	<div class="flex flex-col justify-center items-center">
		<p class="instructions text-white">
			Your browser does not support SpeechRecognition.<br />Please use another browser.
		</p>
	</div>
{/if}

<style>
	ul {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		color: #333;
		text-align: left;
	}
	textarea {
		display: block;
		width: 100%;
		padding: 6px 12px;
		font-size: 14px;
		line-height: 1.42857143;
		color: #555;
		background-color: #fff;
		background-image: none;
		border: 1px solid #ccc;
		-webkit-box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
		box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.075);
		-webkit-transition:
			border-color ease-in-out 0.15s,
			box-shadow ease-in-out 0.15s;
		-o-transition:
			border-color ease-in-out 0.15s,
			box-shadow ease-in-out 0.15s;
		-webkit-transition:
			border-color ease-in-out 0.15s,
			-webkit-box-shadow ease-in-out 0.15s;
		transition:
			border-color ease-in-out 0.15s,
			-webkit-box-shadow ease-in-out 0.15s;
		transition:
			border-color ease-in-out 0.15s,
			box-shadow ease-in-out 0.15s;
		transition:
			border-color ease-in-out 0.15s,
			box-shadow ease-in-out 0.15s,
			-webkit-box-shadow ease-in-out 0.15s;
		border-bottom-left-radius: 15px;
		border-bottom-right-radius: 15px;
	}
	textarea:focus {
		outline: none;
	}
	.input-single {
		position: relative;
		background-color: #fff;
		border-radius: 15px;
		z-index: 5;
		box-shadow: 0px 20px 20px 5px rgba(132, 132, 132, 0.3);
	}
	.instructions {
		text-align: center;
		padding: 21px 0;
		background-color: #6c5b7b;
		border-radius: 4px;
		top: 0px;
		position: relative;
		box-shadow: 1px 7px 14px -5px rgba(0, 0, 0, 0.2);
		padding: 1rem;
	}
	.no-transcription {
		background: #f8b195;
		border-radius: 4px;
		top: 0px;
		position: relative;
		box-shadow: 1px 7px 14px -5px rgba(0, 0, 0, 0.2);
		padding: 1rem;
		width: 100%;
		text-align: center;
	}
</style>
