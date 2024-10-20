<script>
  import "../app.css";
  import Header from "./Header.svelte";
  import { onMount } from 'svelte';
	import { firebaseConfig } from '$lib/firebase_config';
	import { getApps, initializeApp } from 'firebase/app';
	import {
		getAuth,
		signInWithPopup,
		GoogleAuthProvider,
		createUserWithEmailAndPassword,
		updateProfile,
		signInWithEmailAndPassword,

		RecaptchaVerifier,

		signInWithPhoneNumber


	} from 'firebase/auth';
	import { setPersistence, browserSessionPersistence } from 'firebase/auth';
	import { Modal, Toast } from 'flowbite-svelte';
	import { CloseCircleSolid } from 'flowbite-svelte-icons';
	import icon from '$lib/images/icon.png';

	let name = '';
	let phone = '';
	let otp = '';
	let showOtp = false;
	let email = '';
	let password = '';
	let user = null;
	let fApp = null;
	let termsAccepted = false; 
	let signUp = true;
	let phoneSignUp = false;
	let err = null;
	let darkMode = false;
	$: formModal = !user;
	let recaptchaVerifier=null;
	let showNameBox=false;

	onMount(() => {
		const storedUser = localStorage.getItem('user');
		if (storedUser) {
			user = JSON.parse(storedUser);
		}else{
			if (!getApps().length) {
				fApp = initializeApp(firebaseConfig, {
					experimentalForceLongPolling: true,
					useFetchStreams: false
				});
			}else{
				fApp=getApps()[0]
			}
			const auth = getAuth(fApp);

			auth.onAuthStateChanged((currentUser) => {
				user = currentUser;
				if (user) {
					localStorage.setItem('user', JSON.stringify(user));
				} else {
					localStorage.removeItem('user');
				}
			});
		}

	
		const termsCheckbox = document.getElementById('terms');
		const signInBtn = document.getElementById('signInBtn');

		termsCheckbox.addEventListener('change', function () {
			termsAccepted = termsCheckbox.checked;

			if (termsAccepted) {
				signInBtn.disabled = false;
				signInBtn.classList.remove('opacity-50', 'cursor-not-allowed');
			} else {
				signInBtn.disabled = true;
				signInBtn.classList.add('opacity-50', 'cursor-allowed');
			}
		});
	});
	const googleSignIn = async () => {
		if (!termsAccepted) return;

		const provider = new GoogleAuthProvider();
		const auth = getAuth();

		setPersistence(auth, browserSessionPersistence)
			.then(() => {
				return signInWithPopup(auth, provider);
			})
			.then((result) => {
				
				user = result.user;
        
				localStorage.setItem('user', JSON.stringify(user));
			})
			.catch((error) => {
				err = error;
				
			})
			.catch((error) => {
				err = error;
			});
	};
	const handleSignup = async () => {
		if (!termsAccepted) return;

		const auth = getAuth();

		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			user = userCredential.user;
			localStorage.setItem('user', JSON.stringify(user));
			await updateProfile(auth.currentUser, {
				displayName: name,
				photoURL: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg'
			})
				.then(() => {})
				.catch((error) => {
					err = error;
				});

		} catch (error) {
			err = error;
		}
	};
	const handleSignIn = async () => {
		if (!termsAccepted) return;

		const auth = getAuth();

		try {
			await signInWithEmailAndPassword(auth, email, password)
				.then((userCredential) => {
					user = userCredential.user;
					localStorage.setItem('user', JSON.stringify(user));
				})
				.catch((error) => {
					err = error;
				});
		} catch (error) {
			err = error;
		}
	};	
	const setupRecaptchaVerifier = () => {
        try {
			const auth =getAuth(fApp)
            recaptchaVerifier = new RecaptchaVerifier(auth,'recaptcha', {
                callback: async () => {
					try{
						const defaultCode="91"
						const phoneNumber = `+${defaultCode}${phone}`;
						const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
						window.confirmationResult=confirmationResult
						recaptchaVerifier.clear()
						showOtp = true;
						err = null;
					}catch(error){
						err=error
					}
                }
				
            });
            recaptchaVerifier.render();
        } catch (error) {
            console.error('Error initializing RecaptchaVerifier:', error);
            err = error;
        }
    };
    const handlePhoneSignIn = async () => {
        if (!termsAccepted) return;
		if(phone==="" && phone.length>4) return;
        try {
			
			setupRecaptchaVerifier()
        } catch (error) {
            err = error;
            showOtp = false; 
        }
    };
	const setName=async()=>{
		if(name==="") return;
		const auth =getAuth(fApp);
		try{
			await updateProfile(auth.currentUser, {
				displayName: name,
				photoURL: 'https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg'
			})
			showNameBox=false
			
		}catch(error){
				err=error
		}
	};
    const handleOtpVerification = async () => {
        try {
			const confirmationResult =window.confirmationResult
            const credential = await confirmationResult.confirm(otp);
            user = credential.user;
			if(user.displayName!==null){
            localStorage.setItem('user', JSON.stringify(user));
			}else{
				showNameBox=true;
			}
            err = null; 
        } catch (error) {
            err = error;
        }
    };
    
  </script>
  
  
<Header/>
  <slot />

  <Modal
				bind:open={formModal}
				dismissable={false}
				size="xs"
				autoclose={false}
				class="loginForm w-full flex flex-col items-center border-2 justify-center overflow-hidden  rounded-xl border-[#004E86] bg-[#F4FCFF] px-4 lg:px-12 text-center" 
			>
				{#if err}
					<Toast color="red">
						<svelte:fragment slot="icon">
							<CloseCircleSolid class="w-5 h-5" />
							<span class="sr-only">{err.Code}</span>
						</svelte:fragment>
						{err.message}
					</Toast>
				{/if}
				<div class="text-2xl font-bold">AI Nursing Engine</div>
				<div class="text-sm flex flex-col items-center justify-center">
					Powered By:<img src={icon} alt="#" class="w-32" />
				</div>

				<div class="border-[#93B6CF] border-[1px] w-full"></div>
				{#if signUp && !phoneSignUp}
					<p class="font-semibold ">Create your account!</p>
					<form
						class="flex flex-col gap-2 w-full justify-center"
						on:submit|preventDefault={handleSignup}
					>
						<input
							type="text"
							placeholder="Name"
							bind:value={name}
							class="rounded-lg text-[14px]"
							required
						/>
						<input
							type="email"
							placeholder="Email"
							bind:value={email}
							class="rounded-lg text-[14px]"
							required
						/>
						<input
							type="password"
							placeholder="Password"
							bind:value={password}
							class="rounded-lg text-[14px]"
							required
						/>
						<div class="flex items-start pt-1 pb-1">
							<input type="checkbox" id="terms" bind:checked={termsAccepted} required />
							<!-- Added checkbox with binding -->
							<label for="terms" class="ml-2 text-xs text-left"
								>I acknowledge that this is a learning model and information provided is for
								educational purpose only.</label
							>
						</div>
						<button
							type="submit"
							class="w-full rounded-lg bg-[#294254] p-2 text-white text-center disabled:opacity-50"
							disabled={!termsAccepted}>Signup with Email</button
						>
						<!-- Disable button if terms not accepted -->
					</form>
				{:else if !signUp && !phoneSignUp}
					<p class="font-semibold mb-6">SignIn to your account!</p>
					<form
						class="flex flex-col gap-2 w-full justify-center"
						on:submit|preventDefault={handleSignIn}
					>
						<input
							type="email"
							placeholder="Email"
							bind:value={email}
							class="rounded-lg text-[14px]"
							required
						/>
						<input
							type="password"
							placeholder="Password"
							bind:value={password}
							class="rounded-lg text-[14px]"
							required
						/>
						<div class="flex items-start pt-1 pb-1">
							<input type="checkbox" id="terms" bind:checked={termsAccepted} required />
							<!-- Added checkbox with binding -->
							<label for="terms" class="ml-2 text-xs text-left"
								>I acknowledge that this is a learning model and information provided is for
								educational purpose only.</label
							>
						</div>
						<button
							type="submit"
							class="w-full rounded-lg bg-[#294254] p-2 text-white text-center disabled:opacity-50"
							disabled={!termsAccepted}>Signup with Email</button
						>
						<!-- Disable button if terms not accepted -->
					</form>
				{:else}
					{#if showNameBox}
						<p class="font-semibold mb-6">Complete Signing In!</p>
						<form
							class="flex flex-col gap-2 w-full justify-center"
							on:submit|preventDefault={setName}
						>
							<input
								type="text"
								id="phone"
								placeholder="Enter Name"
								bind:value={name}
								class="rounded-lg text-[14px]"
								required
							/>
							
							
								
								<button
									type="submit"
									id="sendOtp"
									class="w-full rounded-lg bg-[#294254] p-2 text-white text-center disabled:bg-[#111d25]"
									>Continue</button
								>
							
						</form>
					{:else}
					<p class="font-semibold mb-6">SignIn to your account!</p>
						<form
							class="flex flex-col gap-2 w-full justify-center"
							on:submit|preventDefault={handlePhoneSignIn}
						>
							<input
								type="text"
								id="phone"
								placeholder="Enter Phone Number"
								bind:value={phone}
								class="rounded-lg text-[14px]"
								required
							/>
							<div id="recaptcha"></div>
							{#if showOtp}
								<input
									type="text"
									placeholder="Enter OTP"
									bind:value={otp}
									class="rounded-lg text-[14px]"
									required
								/>
								<button
									type="button"
									on:click={handleOtpVerification}
									class="w-full rounded-lg bg-[#294254]  p-2 text-white text-center disabled:opacity-50"
									disabled={!termsAccepted}
								>
									Verify OTP
								</button>
							{:else}
								<div class="flex items-start pt-1 pb-1">
									<input type="checkbox" id="terms" bind:checked={termsAccepted} required />
									<label for="terms" class="ml-2 text-xs text-left"
										>I acknowledge that this is a learning model and information provided is for
										educational purpose only.</label
									>
								</div>
								<button
									type="submit"
									id="sendOtp"
									class="w-full rounded-lg bg-[#294254] p-2 text-white text-center disabled:opacity-50"
									disabled={!termsAccepted}>Send OTP</button
								>
							{/if}
						</form>
					{/if}
				{/if}
				<div class="link">
					<p class="mb-2 -mt-2 font-medium">
						SignUp Using  <button
							class="text-blue-600"
							on:click={() => {
								phoneSignUp = !phoneSignUp;
							}}>Phone ?</button
						>
					</p>
				</div>
				<p class="font-bold -pt-2">Or</p>
				<button
					on:click={googleSignIn}
					class="w-full select-none flex flex-row justify-center gap-2 rounded-lg bg-black text-white shadow-gray-900/10 hover:shadow-gray-900/20 py-2 px-6 text-center items-center align-middle font-sans text-md font-bold shadow-md transition-all hover:shadow-lg focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85] active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
					disabled={!termsAccepted}
				>
					<img
						class="w-6 h-6"
						src="https://www.svgrepo.com/show/475656/google-color.svg"
						loading="lazy"
						alt="google logo"
					/>
					<span>Sign with Google</span>
				</button>
				<div class="link">
					<p class="mb-2 -mt-2 font-medium">
						Already have an account? <button
							class="text-blue-600"
							on:click={() => {
								signUp = !signUp;
								phoneSignUp=false
							}}>Log In</button
						>
					</p>
				</div>

			</Modal>
