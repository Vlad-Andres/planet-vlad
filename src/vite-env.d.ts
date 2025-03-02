/// <reference types="vite/client" />

// This declaration allows TypeScript to recognize .vue files as modules
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare type MouseWheelEvent = WheelEvent;