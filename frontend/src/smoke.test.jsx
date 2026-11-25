// Smoke test: renders the real app against a running backend (with demo data) and clicks through the main flows.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import fs from 'node:fs'
import { expect, test } from 'vitest'
import App from './App'
import { ToastProvider } from './context/Toast'

const setup = () => render(<BrowserRouter><ToastProvider><App /></ToastProvider></BrowserRouter>)

test('home renders, memory opens, like and comment work, share dialog opens', async () => {
  const user = userEvent.setup()
  setup()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Your University.')

  const first = await screen.findAllByRole('article', {}, { timeout: 10000 })
  expect(first.length).toBeGreaterThan(3)

  // open a memory
  const card = first[0]
  await user.click(within(card).getAllByRole('button')[0])
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Discussion')).toBeTruthy()

  // like toggles
  const likeBtn = await within(dialog).findByRole('button', { name: /^Like\./ })
  await user.click(likeBtn)
  await waitFor(() => expect(within(dialog).getByRole('button', { name: /^Unlike\./ })).toBeTruthy())

  // comment
  await user.type(within(dialog).getByLabelText('Your comment'), 'Smoke test comment ' + Date.now())
  await user.click(within(dialog).getByRole('button', { name: /Post/ }))
  await waitFor(() => expect(within(dialog).getAllByText(/Smoke test comment/).length).toBeGreaterThan(0))

  // close and open share dialog
  await user.click(within(dialog).getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await user.click(screen.getAllByRole('button', { name: /Share a Memory|Share$/ })[0])
  const share = await screen.findByRole('dialog')
  await user.click(within(share).getByRole('button', { name: /Post to the wall/ }))
  expect(await within(share).findByText('Add at least one photo.')).toBeTruthy()
  expect(within(share).getByText('Choose a category.')).toBeTruthy()
})

test('share dialog rejects bad files, then uploads a real photo end to end', async () => {
  const user = userEvent.setup({ applyAccept: false }) // drag-and-drop ignores the accept attribute, so test that path
  setup()
  await screen.findAllByRole('article', {}, { timeout: 10000 })
  await user.click(screen.getAllByRole('button', { name: /Share a Memory|Share$/ })[0])
  const share = await screen.findByRole('dialog')
  const input = share.querySelector('input[type=file]')

  await user.upload(input, new File(['hello'], 'notes.txt', { type: 'text/plain' }))
  await waitFor(() => expect(within(share).getAllByText(/isn't a JPG, PNG or WebP/).length).toBeGreaterThan(0))

  const jpg = new File([fs.readFileSync('public/demo-art/trip_mountains.jpg')], 'trip.jpg', { type: 'image/jpeg' })
  await user.upload(input, jpg)
  expect(await within(share).findByAltText('Preview of trip.jpg')).toBeTruthy()

  await user.type(within(share).getByLabelText('The story'), 'Frontend end-to-end test upload')
  await user.click(within(share).getByRole('button', { name: 'Funny Moments' }))
  await user.click(within(share).getByRole('switch'))
  await user.click(within(share).getByRole('button', { name: /Post to the wall/ }))
  expect(await within(share).findByText('Thank you for sharing', {}, { timeout: 15000 })).toBeTruthy()

  // the new memory appears on the wall as Anonymous
  await user.click(within(share).getByRole('button', { name: /Share another/ }))
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(screen.getAllByText('Frontend end-to-end test upload').length).toBeGreaterThan(0))
}, 30000)
