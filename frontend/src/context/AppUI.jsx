import { createContext, useContext } from 'react'

// Lets any component open the "Share a memory" dialog.
export const AppUI = createContext({ openShare: () => {} })
export const useAppUI = () => useContext(AppUI)
