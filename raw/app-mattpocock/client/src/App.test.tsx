import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { App } from './App';
import { createApp, type QuayApp } from '../../server/src/app';

let quay: QuayApp | null = null;
let restoreFetch: (() => void) | null = null;

beforeEach(async () => {
  quay = createApp({ filename: ':memory:' });
  const base = await quay.listen(0);
  restoreFetch = bridgeFetch(base);
});

afterEach(async () => {
  cleanup();
  restoreFetch?.();
  restoreFetch = null;
  if (quay) await quay.close();
  quay = null;
});

function bridgeFetch(base: string): () => void {
  const native = globalThis.fetch.bind(globalThis);
  let cookie = '';
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = raw.startsWith('http') ? new URL(raw).pathname + new URL(raw).search : raw;
    const headers = new Headers(init?.headers);
    if (cookie) headers.set('cookie', cookie);
    const res = await native(base + path, { ...init, headers });
    const setCookie = res.headers.getSetCookie()[0] ?? res.headers.get('set-cookie');
    if (setCookie) {
      const pair = setCookie.split(';')[0] ?? '';
      const value = pair.slice(pair.indexOf('=') + 1);
      cookie = value ? pair : '';
    }
    return res;
  };
  return () => {
    globalThis.fetch = native;
  };
}

async function createAccount(email: string) {
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole('heading', { name: 'Sign in to Quay' }, { timeout: 8000 });
  await user.click(screen.getByRole('button', { name: "I'm new here" }));
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), 'correct-horse');
  await user.click(screen.getByRole('button', { name: 'Join Quay' }));
  await screen.findByRole('heading', { name: 'No boards yet' }, { timeout: 8000 });
  return user;
}

async function openBoard(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(screen.getByLabelText('Board name'), name);
  await user.click(screen.getByRole('button', { name: 'Open board' }));
  await screen.findByRole('region', { name: 'To do' }, { timeout: 8000 });
  expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
}

test('a person can join and sign back in', async () => {
  const email = 'ada@quay.test';
  const user = await createAccount(email);
  expect(screen.getByText(email)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('heading', { name: 'Sign in to Quay' });
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');

  await user.clear(screen.getByLabelText('Password'));
  await user.type(screen.getByLabelText('Password'), 'correct-horse');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: 'No boards yet' })).toBeInTheDocument();
});

test('a member can open a board and see three empty columns', async () => {
  const user = await createAccount('ada@quay.test');
  await openBoard(user, 'Launch plan');
  for (const label of ['To do', 'Doing', 'Done']) {
    const column = screen.getByRole('region', { name: label });
    expect(within(column).getByText('Nothing here.')).toBeInTheDocument();
  }
});

test('a member can add a task with a description, assignee, and due date', async () => {
  const email = 'ada@quay.test';
  const user = await createAccount(email);
  await openBoard(user, 'Launch plan');
  const todo = screen.getByRole('region', { name: 'To do' });
  await user.click(within(todo).getByRole('button', { name: 'Add a task' }));
  const dialog = await screen.findByRole('dialog', { name: 'New task' });
  await user.type(within(dialog).getByLabelText('Title'), 'Write the brief');
  await user.type(within(dialog).getByLabelText('Description'), 'One page, no slides.');
  await user.selectOptions(within(dialog).getByLabelText('Assignee'), within(dialog).getByRole('option', { name: email }));
  fireEvent.change(within(dialog).getByLabelText('Due date'), { target: { value: '2020-01-01' } });
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }));

  const card = await screen.findByRole('article', { name: 'Write the brief' });
  expect(card).toHaveTextContent('One page, no slides.');
  expect(card).toHaveTextContent(email);
  expect(card).toHaveTextContent('Overdue');
  expect(card).toHaveTextContent('Jan 1, 2020');
  expect(within(screen.getByRole('region', { name: 'To do' })).getByRole('article', { name: 'Write the brief' })).toBeInTheDocument();
});

test('a member can drag a task from To do to Done', async () => {
  const user = await createAccount('ada@quay.test');
  await openBoard(user, 'Launch plan');
  await user.click(within(screen.getByRole('region', { name: 'To do' })).getByRole('button', { name: 'Add a task' }));
  const dialog = await screen.findByRole('dialog', { name: 'New task' });
  await user.type(within(dialog).getByLabelText('Title'), 'Write the brief');
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }));
  await screen.findByRole('article', { name: 'Write the brief' });

  const card = screen.getByRole('article', { name: 'Write the brief' });
  const done = screen.getByRole('region', { name: 'Done' });
  fireEvent.dragStart(card);
  fireEvent.dragOver(done);
  fireEvent.drop(done);
  fireEvent.dragEnd(card);

  await waitFor(() => {
    expect(within(screen.getByRole('region', { name: 'Done' })).getByRole('heading', { name: 'Write the brief' })).toBeInTheDocument();
  });
  expect(within(screen.getByRole('region', { name: 'To do' })).queryByRole('heading', { name: 'Write the brief' })).not.toBeInTheDocument();

  await user.click(screen.getByRole('article', { name: 'Write the brief' }));
  expect(await screen.findByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
});

test('a member can edit and delete a task', async () => {
  const user = await createAccount('ada@quay.test');
  await openBoard(user, 'Launch plan');
  await user.click(within(screen.getByRole('region', { name: 'Doing' })).getByRole('button', { name: 'Add a task' }));
  let dialog = await screen.findByRole('dialog', { name: 'New task' });
  await user.type(within(dialog).getByLabelText('Title'), 'Write the brief');
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }));
  expect(await within(screen.getByRole('region', { name: 'Doing' })).findByRole('heading', { name: 'Write the brief' })).toBeInTheDocument();

  await user.click(screen.getByRole('article', { name: 'Write the brief' }));
  dialog = await screen.findByRole('dialog', { name: 'Edit task' });
  const title = within(dialog).getByLabelText('Title');
  await user.clear(title);
  await user.type(title, 'Send the brief');
  await user.selectOptions(within(dialog).getByLabelText('Status'), 'done');
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }));

  expect(await within(screen.getByRole('region', { name: 'Done' })).findByRole('heading', { name: 'Send the brief' })).toBeInTheDocument();

  await user.click(screen.getByRole('article', { name: 'Send the brief' }));
  dialog = await screen.findByRole('dialog', { name: 'Edit task' });
  await user.click(within(dialog).getByRole('button', { name: 'Delete task' }));
  await waitFor(() => {
    expect(screen.queryByRole('heading', { name: 'Send the brief' })).not.toBeInTheDocument();
  });
});
