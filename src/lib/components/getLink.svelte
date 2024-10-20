<script>
  import { Button, Modal, Label, Input } from 'flowbite-svelte';
  export let formModal = false;
  export let imageLink
  let input;
</script>


<Modal bind:open={formModal} size="xs" autoclose outsideclose class="w-full">
  <form class="flex flex-col space-y-6" action="#">
    <h3 class="mb-4 text-xl font-medium text-gray-900 dark:text-white">Paste Link of the image</h3>
    <Label class="space-y-2">
      <span>Link</span>
      <Input type="text" name="link" bind:value={input} />
    </Label>
    
    
    <Button type="submit" class="w-full bg-black text-white" on:click={()=>{imageLink=input;formModal=false}}>Upload Image</Button>
  
  </form>
</Modal>

