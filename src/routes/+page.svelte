<script>
	import { browser } from '$app/environment';
	import { createClient } from '@supabase/supabase-js';

	const supabase = browser
		? createClient('https://zaabghrczrbqkxrhkinj.supabase.co', 'sb_publishable_QL6Bz9m30CV8HFIdkLQ42Q_N9AFIOkF')
		: null;

	let email = '';
	let password = '';
	let user = null;
	let lists = [];
	let items = [];
	let activeList = null;
	let listName = '';
	let listOrdered = false;
	let itemText = '';
	let status = '';
	let loading = false;

	function setStatus(text = '') { status = text; }

	async function refreshLists() {
		if (!supabase) return;
		const { data, error } = await supabase.from('lists').select('*').order('created_at');
		if (error) return setStatus(error.message);
		lists = data ?? [];
	}

	async function refreshItems() {
		if (!supabase || !activeList) return;
		const { data, error } = await supabase.from('list_items').select('*')
			.eq('list_id', activeList.id).order('position').order('created_at');
		if (error) return setStatus(error.message);
		items = data ?? [];
	}

	async function applySession(session) {
		user = session?.user ?? null;
		if (user) await refreshLists();
		else { lists = []; items = []; activeList = null; }
	}

	async function signIn() {
		if (!supabase) return;
		loading = true;
		const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
		loading = false;
		if (error) return setStatus(error.message);
		setStatus('');
		await applySession(data.session);
	}

	async function signUp() {
		if (!supabase) return;
		loading = true;
		const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
		loading = false;
		if (error) return setStatus(error.message);
		if (data.session) await applySession(data.session);
		else setStatus('Account created. Check your email if confirmation is required.');
	}

	async function signOut() {
		if (!supabase) return;
		await supabase.auth.signOut({ scope: 'local' });
		await applySession(null);
	}

	async function createList() {
		if (!supabase || !user || !listName.trim()) return;
		const { error } = await supabase.from('lists').insert({
			name: listName.trim(), owner_id: user.id, ordered: listOrdered
		});
		if (error) return setStatus(error.message);
		listName = '';
		listOrdered = false;
		await refreshLists();
	}

	async function openList(list) {
		activeList = list;
		await refreshItems();
	}

	async function addItem() {
		if (!supabase || !user || !activeList || !itemText.trim()) return;
		const latest = await supabase.from('list_items').select('position')
			.eq('list_id', activeList.id).order('position', { ascending: false }).limit(1);
		if (latest.error) return setStatus(latest.error.message);
		const position = (latest.data?.[0]?.position ?? -1) + 1;
		const { error } = await supabase.from('list_items').insert({
			list_id: activeList.id, owner_id: user.id, text: itemText.trim(), position
		});
		if (error) return setStatus(error.message);
		itemText = '';
		await refreshItems();
	}

	async function toggleItem(item) {
		if (!supabase) return;
		const { error } = await supabase.from('list_items').update({ completed: !item.completed }).eq('id', item.id);
		if (error) return setStatus(error.message);
		await refreshItems();
	}

	if (browser) {
		supabase.auth.onAuthStateChange((_event, session) => applySession(session));
		supabase.auth.getSession().then(({ data }) => applySession(data.session));
	}
</script>

<svelte:head>
	<title>eB Lists</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="shell">
	<header>
		<div class="cf-status"><span>●</span> CF: deployed</div>
		<div class="brand"><strong>eB Lists</strong><span>Lists</span></div>
	</header>

	<div class="content">
		<nav aria-label="Lists">
			{#if user}
				<div class="tree-title">Lists</div>
				{#each lists as list}
					<button class:active={activeList?.id === list.id} class="tree-item" onclick={() => openList(list)}>
						{list.name}<small>{list.ordered ? 'ordered' : 'unordered'}</small>
					</button>
				{/each}
			{:else}
				<div class="muted">Sign in to view your lists.</div>
			{/if}
		</nav>

		<main>
			{#if !user}
				<section class="card auth">
					<h2>Sign in</h2>
					<input bind:value={email} type="email" placeholder="Email" autocomplete="email" />
					<input bind:value={password} type="password" placeholder="Password" autocomplete="current-password" />
					<div class="actions">
						<button onclick={signIn} disabled={loading}>Sign in</button>
						<button onclick={signUp} disabled={loading}>Create account</button>
					</div>
				</section>
			{:else}
				<section class="userbar"><strong>{user.email}</strong><button onclick={signOut}>Sign out</button></section>
				<section class="card">
					<h2>Lists</h2>
					<div class="new-list">
						<input bind:value={listName} placeholder="New list name" onkeydown={(e) => e.key === 'Enter' && createList()} />
						<label><input bind:checked={listOrdered} type="checkbox" /> Ordered</label>
						<button onclick={createList}>Create list</button>
					</div>
				</section>

				{#if activeList}
					<section class="card list-view">
						<h2>{activeList.name}</h2>
						<div class="muted">{activeList.ordered ? 'Ordered' : 'Unordered'}</div>
						<div class="new-item">
							<input bind:value={itemText} placeholder="Add an item" onkeydown={(e) => e.key === 'Enter' && addItem()} />
							<button onclick={addItem}>Add</button>
						</div>
						<ol class:ordered={activeList.ordered}>
							{#each items as item}
								<li class:completed={item.completed} onclick={() => toggleItem(item)}>{item.text}</li>
							{/each}
						</ol>
						<p class="muted">Click an item to toggle complete.</p>
					</section>
				{/if}
			{/if}
			{#if status}<p class="status">{status}</p>{/if}
		</main>
	</div>
</div>

<style>
	:global(body) { margin: 0; font-family: system-ui, sans-serif; }
	:global(button), :global(input) { font: inherit; }
	:global(button) { cursor: pointer; }
	.shell { min-height: 100vh; }
	header { height: 56px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 1px solid #8886; padding: 0 16px; box-sizing: border-box; }
	.cf-status { font-size: 12px; white-space: nowrap; }
	.cf-status span { font-size: 10px; }
	.brand { display: flex; align-items: baseline; gap: 10px; }
	.brand strong { font-size: 18px; }
	.brand span { opacity: .65; }
	.content { display: grid; grid-template-columns: 220px minmax(0, 1fr); min-height: calc(100vh - 56px); }
	nav { border-right: 1px solid #8886; padding: 12px; }
	.tree-title { font-weight: 700; margin-bottom: 8px; }
	.tree-item { display: flex; justify-content: space-between; width: 100%; border: 0; background: transparent; text-align: left; padding: 7px 8px; border-radius: 5px; }
	.tree-item:hover, .tree-item.active { background: #8882; }
	.tree-item small { opacity: .55; margin-left: 8px; }
	main { min-width: 0; padding: 16px; }
	.card { border: 1px solid #8886; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
	.auth { max-width: 520px; }
	input { padding: 7px 9px; border: 1px solid #8888; border-radius: 5px; box-sizing: border-box; }
	.auth input { display: block; width: 100%; margin: 6px 0; }
	button { padding: 7px 10px; border: 1px solid #8888; border-radius: 5px; background: ButtonFace; }
	.actions, .new-list, .new-item, .userbar { display: flex; align-items: center; gap: 8px; }
	.userbar { justify-content: flex-end; margin-bottom: 12px; }
	.new-list input, .new-item input { flex: 1; min-width: 120px; }
	h2 { margin-top: 0; }
	ol { padding-left: 28px; }
	li { padding: 5px; cursor: pointer; }
	li.completed { text-decoration: line-through; opacity: .55; }
	.muted { opacity: .65; font-size: 13px; }
	.status { color: #a00; }
	@media (max-width: 650px) { .content { grid-template-columns: 1fr; } nav { border-right: 0; border-bottom: 1px solid #8886; } header { grid-template-columns: 1fr auto; } .cf-status { display: none; } }
</style>
