<script>
import { createEventDispatcher } from "svelte";
import {CloseOutline} from 'flowbite-svelte-icons';
  const dispatch = createEventDispatcher();
  export let transcription = "";
  function closeHandler() {
    dispatch("deleteHandler", {
      dateTime: transcription.date
    });
  }

</script>



<div class="w-full">
  <div class="flex flex-row justify-start gap-2 items-center h-[30px] px-5 text-[#333] shadow-sm shadow-[#cdcdcd] ">
    <small>{transcription.date}</small>
    <button  on:click={closeHandler} ><CloseOutline /></button>
  </div>
  <div class="w-full p-5 border-2 shadow-sm shadow-[#cdcdcd]">
    <div>{transcription.content}</div>
  </div>
 

</div>
