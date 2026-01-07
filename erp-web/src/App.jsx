import { Global } from '@emotion/react'
import { global } from "./styles/global.js"
import { Route, Routes } from 'react-router-dom'
import MainRoute from './routes/MainRoute.jsx/MainRoute.jsx'

function App() {

  return (
    <>
      <Global styles={global} />
      <Routes>
        <Route path="/*" element={<MainRoute />} />
      </Routes>
    </>
  )
}

export default App
