import { writable } from "svelte/store"


export const loginStore=writable({
    userName:null,
    photoURL:null,
})
export const selectedChats=writable([])
export const allChats=writable({})
export const patients=writable({})