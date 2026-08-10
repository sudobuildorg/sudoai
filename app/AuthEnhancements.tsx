'use client';

import { useEffect } from 'react';

export default function AuthEnhancements() {
  useEffect(() => {
    const addForgotPassword = () => {
      const modals = Array.from(document.querySelectorAll('.modal'));
      for (const modal of modals) {
        const heading = modal.querySelector('h2');
        if (!heading || !heading.textContent?.toLowerCase().includes('welcome back')) continue;
        const form = modal.querySelector('form');
        if (!form || modal.querySelector('[data-forgot-password]')) continue;
        const link = document.createElement('a');
        link.dataset.forgotPassword = 'true';
        link.href = '/forgot-password';
        link.textContent = 'Forgot password?';
        link.style.display = 'block';
        link.style.margin = '10px 0 4px';
        link.style.textAlign = 'right';
        link.style.fontSize = '13px';
        link.style.color = 'inherit';
        link.style.textDecoration = 'underline';
        form.insertAdjacentElement('afterend', link);
      }
    };
    addForgotPassword();
    const observer = new MutationObserver(addForgotPassword);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
