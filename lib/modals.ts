'use client';
/** Tiny event bus so any page can open the site-wide modals owned by the header. */
export type ModalName = 'how' | 'stats';

export function openModal(name: ModalName) {
  window.dispatchEvent(new CustomEvent('burner:modal', { detail: name }));
}
