// This file provides a unified useApp hook that works with both Firebase and LocalStorage contexts
// Components import useApp from here instead of directly from context files

// Since App.jsx currently uses Firebase, export the Firebase hook
// When switching to LocalStorage, change this import
export { useApp } from '../context/AppContextFirebase';
