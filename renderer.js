const { ipcRenderer, shell, clipboard } = require('electron');

const profilesList = document.getElementById('profiles-list');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const nameInput = document.getElementById('profile-name-input');
const proxyInput = document.getElementById('profile-proxy-input');
const platformInput = document.getElementById('profile-platform-input');
const avatarPreview = document.getElementById('avatar-preview');
const avatarImg = document.getElementById('avatar-img');
const avatarLetter = document.getElementById('avatar-letter');
const avatarInput = document.getElementById('avatar-input');

const overlayIds = [
  'dashboard-overlay',
  'workspace-overlay',
  'crm-overlay',
  'campaign-overlay',
  'ai-overlay',
  'quick-replies-overlay',
  'modal-overlay',
  'update-overlay',
  'downloads-overlay',
];

const defaultState = {
  profiles: [],
  quickReplies: [],
  crmContacts: [],
  campaigns: [],
  analyticsEvents: [],
  aiSettings: { endpoint: '', apiKey: '', model: 'gpt-4o-mini' },
};

let workspaceState = ipcRenderer.sendSync('workspace-get-state') || { currentId: 'default', workspaces: [], data: defaultState };
let workspaceData = normalizeWorkspaceData(workspaceState.data);
let profiles = normalizeProfiles(workspaceData.profiles);
let activeProfileId = profiles[0]?.id || null;
let downloads = [];
let updateState = { status: 'idle', progress: 0, message: '' };
let appLocked = false;
let hasLockPassword = false;
let isDarkMode = false;
let editingProfile = null;
let tempAvatarPath = null;
let tempAvatarOptOut = false;
let editingContactId = null;
let selectedCampaignId = null;
let currentChatSnapshot = null;
let campaignTimers = {};
let currentCampaignTargetSource = 'recent';
const campaignTargetSelections = {
  crm: new Set(),
  recent: new Set(),
};
const subscriptionFeatures = { maxAccountsPerApp: null, unlimitedProxies: true };

function normalizeWorkspaceData(data = {}) {
  return {
    ...defaultState,
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles : [],
    quickReplies: Array.isArray(data.quickReplies) ? data.quickReplies : [],
    crmContacts: Array.isArray(data.crmContacts) ? data.crmContacts : [],
    campaigns: Array.isArray(data.campaigns) ? data.campaigns : [],
    analyticsEvents: Array.isArray(data.analyticsEvents) ? data.analyticsEvents : [],
    recentChats: sanitizeRecentChats(data.recentChats),
    aiSettings: { ...defaultState.aiSettings, ...(data.aiSettings || {}) },
  };
}
function createProfileId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createProfilePartition(id, platform = 'zalo') {
  const safePlatform = String(platform || 'zalo').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  return `persist:${safePlatform}_${id}`;
}

function normalizeProfiles(list) {
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) {
    const id = createProfileId();
    return [{ id, name: 'Nick 1', partition: createProfilePartition(id, 'zalo'), platform: 'zalo' }];
  }
  const usedIds = new Set();
  const usedPartitions = new Set();
  return arr.map((p) => {
    let avatarUrl = p.avatar;
    if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
      avatarUrl = '';
    }
    let id = p.id || createProfileId();
    while (usedIds.has(id)) id = createProfileId();
    usedIds.add(id);

    const platform = p.platform || 'zalo';
    let partition = p.partition || createProfilePartition(id, platform);
    if (usedPartitions.has(partition)) {
      partition = createProfilePartition(`${id}_${Math.random().toString(36).slice(2, 8)}`, platform);
    }
    usedPartitions.add(partition);

    return { ...p, id, avatar: avatarUrl, platform, partition, avatarOptOut: !!p.avatarOptOut };
  });
}
function persistWorkspace() {
  workspaceData.profiles = profiles;
  workspaceData = normalizeWorkspaceData(workspaceData);
  workspaceState = ipcRenderer.sendSync('workspace-save-data', workspaceData);
  workspaceData = normalizeWorkspaceData(workspaceState.data);
  profiles = normalizeProfiles(workspaceData.profiles);
  if (!profiles.some((p) => p.id === activeProfileId)) activeProfileId = profiles[0]?.id || null;
}
function trackEvent(type, payload = {}) {
  workspaceData.analyticsEvents.unshift({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`, type, payload, createdAt: Date.now() });
  workspaceData.analyticsEvents = workspaceData.analyticsEvents.slice(0, 120);
  persistWorkspace();
  renderDashboard();
}
function openOverlay(id) {
  ipcRenderer.send('set-browserview-visibility', false);
  document.getElementById(id).style.display = 'flex';
}
function closeOverlay(id) {
  document.getElementById(id).style.display = 'none';
  const stillOpen = overlayIds.some((overlayId) => document.getElementById(overlayId) && document.getElementById(overlayId).style.display === 'flex');
  if (!stillOpen && !appLocked && !toolsLauncherOpen) ipcRenderer.send('set-browserview-visibility', true);
}
function escapeHtml(s) { return String(s || '').replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
// nguồn path (verify 07/10/2026, fetch trực tiếp file .svg):
// zalo/telegram/messenger/facebook/whatsapp/discord/gmail = simpleicons.org/icons/{slug}.svg (bản hiện tại)
// fanpage = reuse path facebook (Fanpage là Facebook Page)
// teams = simple-icons v9 icons/microsoftteams.svg (bản hiện tại đã gỡ; CC0 vẫn hiệu lực — đừng "update" mất)
// threads/x/instagram/linkedin/slack = simpleicons.org/icons/{slug}.svg (bản hiện tại)
// skype = simple-icons v9 icons/skype.svg (bản hiện tại đã gỡ giống teams; CC0 vẫn hiệu lực)
// custom = lucide link (giữ nguyên trong repo)
const BRAND_SVG_REAL = {
  zalo: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z"/></svg>',
  telegram: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
  messenger: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13"/></svg>',
  fanpage: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>',
  facebook: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>',
  whatsapp: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  discord: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>',
  teams: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.625 8.127q-.55 0-1.025-.205-.475-.205-.832-.563-.358-.357-.563-.832Q18 6.053 18 5.502q0-.54.205-1.02t.563-.837q.357-.358.832-.563.474-.205 1.025-.205.54 0 1.02.205t.837.563q.358.357.563.837.205.48.205 1.02 0 .55-.205 1.025-.205.475-.563.832-.357.358-.837.563-.48.205-1.02.205zm0-3.75q-.469 0-.797.328-.328.328-.328.797 0 .469.328.797.328.328.797.328.469 0 .797-.328.328-.328.328-.797 0-.469-.328-.797-.328-.328-.797-.328zM24 10.002v5.578q0 .774-.293 1.46-.293.685-.803 1.194-.51.51-1.195.803-.686.293-1.459.293-.445 0-.908-.105-.463-.106-.85-.329-.293.95-.855 1.729-.563.78-1.319 1.336-.756.557-1.67.861-.914.305-1.898.305-1.148 0-2.162-.398-1.014-.399-1.805-1.102-.79-.703-1.312-1.664t-.674-2.086h-5.8q-.411 0-.704-.293T0 16.881V6.873q0-.41.293-.703t.703-.293h8.59q-.34-.715-.34-1.5 0-.727.275-1.365.276-.639.75-1.114.475-.474 1.114-.75.638-.275 1.365-.275t1.365.275q.639.276 1.114.75.474.475.75 1.114.275.638.275 1.365t-.275 1.365q-.276.639-.75 1.113-.475.475-1.114.75-.638.276-1.365.276-.188 0-.375-.024-.188-.023-.375-.058v1.078h10.875q.469 0 .797.328.328.328.328.797zM12.75 2.373q-.41 0-.78.158-.368.158-.638.434-.27.275-.428.639-.158.363-.158.773 0 .41.158.78.159.368.428.638.27.27.639.428.369.158.779.158.41 0 .773-.158.364-.159.64-.428.274-.27.433-.639.158-.369.158-.779 0-.41-.158-.773-.159-.364-.434-.64-.275-.275-.639-.433-.363-.158-.773-.158zM6.937 9.814h2.25V7.94H2.814v1.875h2.25v6h1.875zm10.313 7.313v-6.75H12v6.504q0 .41-.293.703t-.703.293H8.309q.152.809.556 1.5.405.691.985 1.19.58.497 1.318.779.738.281 1.582.281.926 0 1.746-.352.82-.351 1.436-.966.615-.616.966-1.43.352-.815.352-1.752zm5.25-1.547v-5.203h-3.75v6.855q.305.305.691.452.387.146.809.146.469 0 .879-.176.41-.175.715-.48.304-.305.48-.715t.176-.879Z"/></svg>',
  gmail: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>',
  threads: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/></svg>',
  x: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/></svg>',
  instagram: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/></svg>',
  linkedin: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  slack: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg>',
  skype: '<svg class="brand" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12.069 18.874c-4.023 0-5.82-1.979-5.82-3.464 0-.765.561-1.296 1.333-1.296 1.723 0 1.273 2.477 4.487 2.477 1.641 0 2.55-.895 2.55-1.811 0-.551-.269-1.16-1.354-1.429l-3.576-.895c-2.88-.724-3.403-2.286-3.403-3.751 0-3.047 2.861-4.191 5.549-4.191 2.471 0 5.393 1.373 5.393 3.199 0 .784-.688 1.24-1.453 1.24-1.469 0-1.198-2.037-4.164-2.037-1.469 0-2.292.664-2.292 1.617s1.153 1.258 2.157 1.487l2.637.587c2.891.649 3.624 2.346 3.624 3.944 0 2.476-1.902 4.324-5.722 4.324m11.084-4.882l-.029.135-.044-.24c.015.045.044.074.059.12.12-.675.181-1.363.181-2.052 0-1.529-.301-3.012-.898-4.42-.569-1.348-1.395-2.562-2.427-3.596-1.049-1.033-2.247-1.856-3.595-2.426-1.318-.631-2.801-.93-4.328-.93-.72 0-1.444.07-2.143.204l.119.06-.239-.033.119-.025C8.91.274 7.829 0 6.731 0c-1.789 0-3.47.698-4.736 1.967C.729 3.235.032 4.923.032 6.716c0 1.143.292 2.265.844 3.258l.02-.124.041.239-.06-.115c-.114.645-.172 1.299-.172 1.955 0 1.53.3 3.017.884 4.416.568 1.362 1.378 2.576 2.427 3.609 1.034 1.05 2.247 1.857 3.595 2.442 1.394.6 2.877.898 4.404.898.659 0 1.334-.06 1.977-.179l-.119-.062.24.046-.135.03c1.002.569 2.126.871 3.294.871 1.783 0 3.459-.69 4.733-1.963 1.259-1.259 1.962-2.951 1.962-4.749 0-1.138-.299-2.262-.853-3.266"/></svg>',
  custom: '<svg class="brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
};
function formatDate(ts) { return new Date(ts || Date.now()).toLocaleString('vi-VN'); }
function getActiveProfile() { return profiles.find((p) => p.id === activeProfileId) || profiles[0] || null; }
function getZaloProfiles() { return profiles.filter((profile) => (profile.platform || 'zalo') === 'zalo'); }
function getCurrentWorkspaceName() { return workspaceState.workspaces.find((w) => w.id === workspaceState.currentId)?.name || 'Workspace'; }
function statusLabel(status) { return ({ new: 'Mới', hot: 'Khách nóng', follow: 'Đang chăm sóc', bought: 'Đã mua', blacklist: 'Blacklist' }[status] || status || 'Mới'); }
function sanitizeRecentChats(list = []) {
  const blocked = ['tin nhắn', 'danh bạ', 'zalo cloud', 'công cụ', 'giao việc', 'lịch sử đồng bộ', 'cài đặt'];
  return (Array.isArray(list) ? list : [])
    .map((name) => String(name || '').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim())
    .filter((name, index, arr) => {
      if (!name) return false;
      const lower = name.toLowerCase();
      if (blocked.some((keyword) => lower === keyword || lower.includes(keyword))) return false;
      return arr.indexOf(name) === index;
    });
}
function randomBetween(min, max) {
  const low = Number(min) || 1000;
  const high = Number(max) || low;
  return Math.floor(low + Math.random() * Math.max(high - low, 1));
}
let toolsLauncherOpen = false;
const TOOL_ACTION_HANDLERS = {
  dashboard: () => { renderDashboard(); openOverlay('dashboard-overlay'); },
  workspaces: () => { renderWorkspaces(); openOverlay('workspace-overlay'); },
  crm: () => { renderCRMCurrentChat(); openOverlay('crm-overlay'); },
  campaigns: () => { renderCampaigns(); openOverlay('campaign-overlay'); },
  ai: () => { fillAISettings(); openOverlay('ai-overlay'); },
  'quick-replies': () => { renderQuickReplies(); openOverlay('quick-replies-overlay'); },
  update: () => { openOverlay('update-overlay'); ipcRenderer.send('check-for-updates'); ipcRenderer.send('get-update-state'); },
  lock: () => ipcRenderer.send('lock-app'),
  shield: () => ipcRenderer.send('toggle-zadark-shield'),
  'dark-mode': () => {
    isDarkMode = !isDarkMode;
    document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
    document.getElementById('icon-sun').style.display = isDarkMode ? 'none' : 'block';
    document.getElementById('icon-moon').style.display = isDarkMode ? 'block' : 'none';
    ipcRenderer.send('set-theme', isDarkMode);
  },
  'zoom-in': () => ipcRenderer.send('zoom-in'),
  'zoom-out': () => ipcRenderer.send('zoom-out'),
  fullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  pin: () => {
    document.getElementById('btn-pin').classList.toggle('active');
    ipcRenderer.send('toggle-always-on-top');
  },
  reload: () => ipcRenderer.send('reload-page'),
};
function setLauncherOpen(open) {
  toolsLauncherOpen = !!open;
  const overlay = document.getElementById('tools-overlay');
  const trigger = document.getElementById('btn-tools-launcher');
  if (!overlay || !trigger) return;
  overlay.classList.toggle('open', toolsLauncherOpen);
  overlay.setAttribute('aria-hidden', toolsLauncherOpen ? 'false' : 'true');
  trigger.classList.toggle('active', toolsLauncherOpen);

  if (toolsLauncherOpen) {
    ipcRenderer.send('set-browserview-visibility', false);
  } else {
    const stillOpen = overlayIds.some((overlayId) => document.getElementById(overlayId) && document.getElementById(overlayId).style.display === 'flex');
    if (!stillOpen && !appLocked) ipcRenderer.send('set-browserview-visibility', true);
  }
}
function runToolAction(action, autoClose = true) {
  const handler = TOOL_ACTION_HANDLERS[action];
  if (!handler) return;
  if (autoClose) setLauncherOpen(false);
  handler();
}
function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function migrateLegacyProfiles() {
  if (workspaceData.profiles.length) return;
  try {
    const saved = localStorage.getItem('mp_profiles');
    if (saved) {
      const legacyProfiles = JSON.parse(saved);
      if (Array.isArray(legacyProfiles) && legacyProfiles.length) {
        profiles = normalizeProfiles(legacyProfiles);
        workspaceData.profiles = profiles;
      }
    }
  } catch (e) { }
  if (!workspaceData.quickReplies.length) {
    try {
      const settings = ipcRenderer.sendSync('get-settings');
      workspaceData.quickReplies = settings.quickReplies || [];
    } catch (e) { }
  }
  persistWorkspace();
}

function renderSidebar() {
  profilesList.innerHTML = '';
  profiles.forEach((p) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `profile-btn ${p.id === activeProfileId ? 'active' : ''}`;
    const label = `${p.name} (${p.platform || 'zalo'})`;
    btn.setAttribute('aria-label', label);
    btn.dataset.tip = label;
    if (p.id === activeProfileId) btn.setAttribute('aria-current', 'true');
    btn.disabled = appLocked;
    if (p.avatar) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = p.avatar.startsWith('http') || p.avatar.startsWith('data:') ? p.avatar : `file://${String(p.avatar).replace(/\\/g, '/')}`;
      img.style.cssText = 'width:100%;height:100%;border-radius:inherit;object-fit:cover;position:absolute;inset:0;';
      btn.appendChild(img);
    } else {
      btn.innerHTML = BRAND_SVG_REAL[p.platform] || BRAND_SVG_REAL.custom;
      btn.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    }
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.id = `badge-${p.id}`;
    badge.innerText = '0';
    badge.setAttribute('aria-hidden', 'true');
    btn.appendChild(badge);
    btn.onclick = () => !appLocked && switchProfile(p.id);
    btn.oncontextmenu = (e) => { e.preventDefault(); if (!appLocked) openModal(p); };
    profilesList.appendChild(btn);
  });
}
// ponytail: native Tab vẫn đủ a11y; arrows chỉ là tiện ích
profilesList.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const btns = [...profilesList.querySelectorAll('.profile-btn:not(:disabled)')];
  const i = btns.indexOf(document.activeElement);
  e.preventDefault();
  (btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length] || btns[0])?.focus();
});
function switchProfile(id) {
  activeProfileId = id;
  renderSidebar();
  const profile = getActiveProfile();
  if (profile) ipcRenderer.send('switch-profile', profile);
  renderCRMCurrentChat();
  renderCampaigns();
  if (document.getElementById('campaign-target-list')) document.getElementById('campaign-target-list').innerHTML = '<div class="muted">Đã đổi profile, vui lòng tải lại danh sách...</div>';
}
function openModal(profileToEdit = null) {
  editingProfile = profileToEdit;
  tempAvatarPath = profileToEdit ? profileToEdit.avatar : null;
  tempAvatarOptOut = !!(profileToEdit && profileToEdit.avatarOptOut);
  modalTitle.innerText = profileToEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản';
  nameInput.value = profileToEdit ? profileToEdit.name : '';
  proxyInput.value = profileToEdit?.proxy || '';
  platformInput.value = profileToEdit?.platform || 'zalo';
  if (typeof ppRender === 'function') ppRender();
  const customUrlInput = document.getElementById('profile-custom-url-input');
  customUrlInput.value = profileToEdit?.customUrl || '';
  customUrlInput.style.display = (profileToEdit?.platform === 'custom') ? 'block' : 'none';
  document.getElementById('modal-delete').style.display = profileToEdit ? 'inline-flex' : 'none';
  updateAvatarPreview();
  openOverlay('modal-overlay');
  nameInput.focus();
}
function updateAvatarPreview() {
  const clearBtn = document.getElementById('avatar-clear');
  if (clearBtn) clearBtn.style.display = tempAvatarPath ? 'inline-flex' : 'none';
  if (tempAvatarPath) {
    avatarImg.src = tempAvatarPath.startsWith('http') || tempAvatarPath.startsWith('data:') ? tempAvatarPath : `file://${String(tempAvatarPath).replace(/\\/g, '/')}`;
    avatarImg.style.display = 'block';
    avatarLetter.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarLetter.style.display = 'block';
    avatarLetter.innerHTML = BRAND_SVG_REAL[platformInput.value || 'zalo'] || BRAND_SVG_REAL.custom;
  }
}

function renderDashboard() {
  const contacts = workspaceData.crmContacts || [];
  const campaigns = workspaceData.campaigns || [];
  const quickReplies = workspaceData.quickReplies || [];
  const events = workspaceData.analyticsEvents || [];
  const running = campaigns.filter((c) => c.status === 'running').length;
  const completed = campaigns.filter((c) => c.status === 'done').length;
  document.getElementById('dashboard-stats').innerHTML = [
    { label: 'Profiles', value: profiles.length, foot: 'Tài khoản trong workspace' },
    { label: 'CRM Contacts', value: contacts.length, foot: 'Tổng khách hàng cục bộ' },
    { label: 'Campaigns', value: campaigns.length, foot: `${running} chạy • ${completed} hoàn tất` },
    { label: 'Quick Replies', value: quickReplies.length, foot: 'Mẫu phản hồi nhanh' },
    { label: 'Downloads', value: downloads.length, foot: 'Lịch sử tải xuống' },
    { label: 'Events', value: events.length, foot: 'Analytics nội bộ' },
  ].map((item) => `<div class="metric-card"><div class="metric-label">${item.label}</div><div class="metric-value">${item.value}</div><div class="metric-foot">${item.foot}</div></div>`).join('');
  document.getElementById('dashboard-current-workspace').innerText = getCurrentWorkspaceName();
  document.getElementById('dashboard-workspace-summary').innerHTML = `Workspace <strong>${escapeHtml(getCurrentWorkspaceName())}</strong> đang chứa <strong>${profiles.length}</strong> profile, <strong>${contacts.length}</strong> contact và <strong>${quickReplies.length}</strong> quick replies.`;
  const sentCount = campaigns.reduce((sum, c) => sum + ((c.logs || []).filter((log) => log.status === 'sent').length), 0);
  const failCount = campaigns.reduce((sum, c) => sum + ((c.logs || []).filter((log) => log.status === 'failed').length), 0);
  document.getElementById('dashboard-kpis').innerHTML = `
    <span class="chip success">${sentCount} lượt gửi OK</span>
    <span class="chip hot">${running} campaign chạy</span>
    <span class="chip danger">${failCount} lượt lỗi</span>
    <span class="chip">${events.filter((e) => e.type === 'ai_rewrite').length} AI rewrite</span>`;
  const activityList = document.getElementById('activity-list');
  const latest = events.slice(0, 12);
  if (!latest.length) activityList.innerHTML = '<div class="empty-state">Chưa có activity nào.</div>';
  else activityList.innerHTML = latest.map((event) => `<div class="activity-item"><div class="row"><div class="title-sm">${escapeHtml(event.type)}</div><div class="muted">${formatDate(event.createdAt)}</div></div><div class="muted">${escapeHtml(JSON.stringify(event.payload || {}))}</div></div>`).join('');
}

function renderWorkspaces() {
  const list = document.getElementById('workspace-list');
  if (!workspaceState.workspaces.length) {
    list.innerHTML = '<div class="empty-state">Chưa có workspace.</div>';
    return;
  }
  list.innerHTML = workspaceState.workspaces.map((workspace) => `
    <div class="workspace-item">
      <div class="row"><div><div class="title-lg">${escapeHtml(workspace.name)}</div><div class="muted">${workspace.id} • ${formatDate(workspace.createdAt)}</div></div><button class="modal-btn ${workspace.id === workspaceState.currentId ? 'save' : 'cancel'}" data-workspace="${workspace.id}">${workspace.id === workspaceState.currentId ? 'Đang dùng' : 'Chuyển'}</button></div>
    </div>`).join('');
  list.querySelectorAll('[data-workspace]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.getAttribute('data-workspace');
      if (id === workspaceState.currentId) return;
      workspaceState = ipcRenderer.sendSync('workspace-switch', id);
      workspaceData = normalizeWorkspaceData(workspaceState.data);
      profiles = normalizeProfiles(workspaceData.profiles);
      activeProfileId = profiles[0]?.id || null;
      closeOverlay('workspace-overlay');
      renderAll();
      if (activeProfileId) switchProfile(activeProfileId);
      trackEvent('workspace_switch', { workspaceId: id });
    };
  });
}

function renderCurrentChatSummary() {
  const box = document.getElementById('crm-current-chat');
  if (!currentChatSnapshot) {
    box.innerHTML = 'Chưa có dữ liệu tab hiện tại.';
    return;
  }
  box.innerHTML = `<div class="title-sm">${escapeHtml(currentChatSnapshot.name || 'Không rõ tên')}</div><div class="muted">Platform: ${escapeHtml(currentChatSnapshot.platform || '')}</div><div class="muted">Profile: ${escapeHtml(getActiveProfile()?.name || '')}</div>`;
}
function renderCRMList() {
  const query = document.getElementById('crm-search').value.trim().toLowerCase();
  const activeProfile = getActiveProfile();
  const contacts = (workspaceData.crmContacts || []).filter((contact) => !activeProfile || contact.profileId === activeProfile.id);
  const filtered = contacts.filter((contact) => [contact.name, contact.phone, (contact.tags || []).join(',')].join(' ').toLowerCase().includes(query));
  const list = document.getElementById('crm-contact-list');
  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state">Chưa có contact cho profile này.</div>';
    return;
  }
  list.innerHTML = filtered.map((contact) => `
    <div class="contact-item" data-contact="${contact.id}">
      <div class="row"><div><div class="title-sm">${escapeHtml(contact.name || 'Chưa đặt tên')}</div><div class="muted">${escapeHtml(contact.phone || 'Chưa có số điện thoại')}</div></div><span class="chip ${contact.status === 'hot' ? 'hot' : contact.status === 'blacklist' ? 'danger' : contact.status === 'bought' ? 'success' : ''}">${escapeHtml(statusLabel(contact.status))}</span></div>
      <div class="tag-list mt-12">${(contact.tags || []).map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="muted mt-12">${escapeHtml(contact.note || '')}</div>
    </div>`).join('');
  list.querySelectorAll('[data-contact]').forEach((item) => {
    item.onclick = () => {
      const contact = workspaceData.crmContacts.find((entry) => entry.id === item.getAttribute('data-contact'));
      if (contact) fillContactForm(contact);
    };
  });
}
function fillContactForm(contact) {
  editingContactId = contact?.id || null;
  document.getElementById('crm-name').value = contact?.name || '';
  document.getElementById('crm-phone').value = contact?.phone || '';
  document.getElementById('crm-status').value = contact?.status || 'new';
  document.getElementById('crm-tags').value = (contact?.tags || []).join(', ');
  document.getElementById('crm-note').value = contact?.note || '';
  document.getElementById('crm-selected-label').innerText = contact ? `Đang sửa: ${contact.name}` : 'Đang tạo contact mới';
}
function renderCRMCurrentChat() {
  renderCurrentChatSummary();
  renderCRMList();
  const zaloCount = getZaloProfiles().length;
  const activeZaloContacts = (workspaceData.crmContacts || []).filter((contact) => contact.profileId === getActiveProfile()?.id && (getActiveProfile()?.platform || 'zalo') === 'zalo').length;
  document.getElementById('campaign-target-count').innerText = `${zaloCount} Zalo account • ${activeZaloContacts} CRM target`;
}
function saveContact() {
  const activeProfile = getActiveProfile();
  if (!activeProfile) return alert('Chưa có profile nào.');
  const name = document.getElementById('crm-name').value.trim();
  if (!name) return alert('Vui lòng nhập tên contact.');
  const payload = {
    id: editingContactId || `crm_${Date.now()}`,
    profileId: activeProfile.id,
    name,
    phone: document.getElementById('crm-phone').value.trim(),
    status: document.getElementById('crm-status').value,
    tags: document.getElementById('crm-tags').value.split(',').map((item) => item.trim()).filter(Boolean),
    note: document.getElementById('crm-note').value.trim(),
    platform: activeProfile.platform,
    updatedAt: Date.now(),
  };
  if (editingContactId) workspaceData.crmContacts = workspaceData.crmContacts.map((entry) => entry.id === editingContactId ? payload : entry);
  else workspaceData.crmContacts.unshift({ ...payload, createdAt: Date.now() });
  persistWorkspace();
  trackEvent(editingContactId ? 'crm_contact_updated' : 'crm_contact_created', { id: payload.id, profileId: activeProfile.id });
  fillContactForm(null);
  renderCRMCurrentChat();
  renderDashboard();
}
function deleteContact() {
  if (!editingContactId) return;
  if (!confirm('Xóa contact này?')) return;
  workspaceData.crmContacts = workspaceData.crmContacts.filter((entry) => entry.id !== editingContactId);
  persistWorkspace();
  trackEvent('crm_contact_deleted', { id: editingContactId });
  fillContactForm(null);
  renderCRMCurrentChat();
}

function renderCampaigns() {
  const list = document.getElementById('campaign-list');
  const activeProfile = getActiveProfile();
  const campaigns = (workspaceData.campaigns || []).filter((campaign) => campaign.platform === 'zalo' || (!campaign.platform && (!activeProfile || campaign.profileId === activeProfile.id)));
  if (!campaigns.length) {
    list.innerHTML = '<div class="empty-state">Chưa có campaign nào.</div>';
    return;
  }
  list.innerHTML = campaigns.map((campaign) => {
    const sent = (campaign.logs || []).filter((log) => log.status === 'sent').length;
    const failed = (campaign.logs || []).filter((log) => log.status === 'failed').length;
    const total = campaign.targets?.length || 0;
    return `
      <div class="campaign-item" data-campaign="${campaign.id}">
        <div class="row"><div><div class="title-sm">${escapeHtml(campaign.name)}</div><div class="muted">${sent}/${total} sent • ${failed} fail</div></div><span class="pill ${escapeHtml(campaign.status || 'draft')}">${escapeHtml(campaign.status || 'draft')}</span></div>
        <div class="muted mt-12">${escapeHtml(campaign.message || '')}</div>
        <div class="row mt-12"><button class="modal-btn cancel" data-action="select">Chọn</button><button class="modal-btn cancel" data-action="pause">Pause</button><button class="modal-btn cancel" data-action="stop">Stop</button><button class="modal-btn warn" data-action="delete">Xóa</button></div>
      </div>`;
  }).join('');
  list.querySelectorAll('[data-campaign]').forEach((item) => {
    const id = item.getAttribute('data-campaign');
    item.querySelector('[data-action="select"]').onclick = () => { selectedCampaignId = id; alert('Đã chọn campaign để chạy.'); };
    item.querySelector('[data-action="pause"]').onclick = () => pauseCampaign(id);
    item.querySelector('[data-action="stop"]').onclick = () => stopCampaign(id);
    item.querySelector('[data-action="delete"]').onclick = () => deleteCampaign(id);
  });
}
function deleteCampaign(campaignId) {
  if (confirm('Bạn có chắc chắn muốn xóa campaign này?')) {
    if (campaignTimers[campaignId]) clearTimeout(campaignTimers[campaignId]);
    workspaceData.campaigns = workspaceData.campaigns.filter((c) => c.id !== campaignId);
    if (selectedCampaignId === campaignId) selectedCampaignId = null;
    persistWorkspace();
    trackEvent('campaign_deleted', { id: campaignId });
    renderCampaigns();
  }
}
function renderCampaignTargets(source = currentCampaignTargetSource) {
  const list = document.getElementById('campaign-target-list');
  const activeProfile = getActiveProfile();
  if (!activeProfile || !list) return;
  currentCampaignTargetSource = source;

  const selectedSet = campaignTargetSelections[source] || new Set();
  let targets = [];
  if (source === 'crm') {
    targets = workspaceData.crmContacts
      .filter((c) => c.profileId === activeProfile.id)
      .map((contact) => ({ value: contact.name, label: `${contact.name} (${contact.phone})` }));
  } else if (source === 'recent') {
    const recentTargets = sanitizeRecentChats(workspaceData.recentChats);
    workspaceData.recentChats = recentTargets;
    targets = recentTargets.map((name) => ({ value: name, label: name }));
  }

  if (!targets.length) {
    list.innerHTML = source === 'crm'
      ? '<div class="muted">Chưa có CRM contact cho profile này.</div>'
      : '<div class="muted">Chưa tải được hội thoại gần đây. Hãy vào tab Zalo để extension quét.</div>';
    return;
  }

  list.innerHTML = targets.map((target) => {
    const checked = selectedSet.has(target.value) ? 'checked' : '';
    return `<label style="display:flex; align-items:center; gap:10px; padding:6px; cursor:pointer;"><input type="checkbox" name="camp_target" value="${escapeHtml(target.value)}" ${checked}> <span style="font-size:13px;">${escapeHtml(target.label)}</span></label>`;
  }).join('');

  list.querySelectorAll('input[name="camp_target"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) selectedSet.add(input.value);
      else selectedSet.delete(input.value);
    });
  });
}

function createCampaign() {
  const activeProfile = getActiveProfile();
  if (!activeProfile) return alert('Chưa có profile.');
  if ((activeProfile.platform || 'zalo') !== 'zalo') return alert('Tính năng gửi hàng loạt chỉ áp dụng cho tài khoản Zalo. Hãy chọn một profile Zalo trước.');
  const zaloProfiles = getZaloProfiles();
  if (!zaloProfiles.length) return alert('Workspace chưa có tài khoản Zalo nào.');
  const mode = document.getElementById('campaign-mode').value;
  const selectedTargets = Array.from(document.querySelectorAll('input[name="camp_target"]:checked')).map(el => ({ id: el.value, name: el.value, phone: '' }));
  
  if (mode !== 'zalo_accounts' && !selectedTargets.length) {
    return alert('Vui lòng chọn ít nhất 1 người nhận từ danh sách!');
  }
  
  const name = document.getElementById('campaign-name').value.trim();
  const message = document.getElementById('campaign-message').value.trim();
  if (!name || !message) return alert('Vui lòng nhập tên chiến dịch và nội dung.');
  const batchSize = Number(document.getElementById('campaign-batch-size').value || 20);
  const campaign = {
    id: `camp_${Date.now()}`,
    platform: 'zalo',
    profileId: activeProfile.id,
    profileIds: mode === 'zalo_accounts' ? zaloProfiles.map((profile) => profile.id) : [activeProfile.id],
    name,
    message,
    delayMin: Number(document.getElementById('campaign-delay-min').value || 2500),
    delayMax: Number(document.getElementById('campaign-delay-max').value || 6500),
    batchSize,
    mode,
    status: 'draft',
    createdAt: Date.now(),
    targets: mode === 'zalo_accounts' ? [] : selectedTargets.slice(0, batchSize),
    accountLogs: [],
    logs: [],
  };
  workspaceData.campaigns.unshift(campaign);
  selectedCampaignId = campaign.id;
  persistWorkspace();
  trackEvent('campaign_created', { id: campaign.id, targets: campaign.targets.length });
  renderCampaigns();
  renderDashboard();
}
function updateCampaign(campaignId, patch) {
  workspaceData.campaigns = workspaceData.campaigns.map((campaign) => campaign.id === campaignId ? { ...campaign, ...patch } : campaign);
  persistWorkspace();
  renderCampaigns();
  renderDashboard();
}
async function runCampaign(campaignId) {
  const campaign = workspaceData.campaigns.find((entry) => entry.id === campaignId);
  if (!campaign) return alert('Không tìm thấy campaign.');
  if (campaign.platform && campaign.platform !== 'zalo') return alert('Campaign này không phải campaign Zalo.');
  campaign.status = 'running';
  persistWorkspace();
  renderCampaigns();
  trackEvent('zalo_campaign_started', { id: campaignId, mode: campaign.mode });
  if (campaign.mode === 'zalo_accounts') return runZaloAccountsCampaign(campaignId);
  for (const target of campaign.targets) {
    const latest = workspaceData.campaigns.find((entry) => entry.id === campaignId);
    if (!latest || latest.status === 'stopped') break;
    if (latest.status === 'paused') {
      campaignTimers[campaignId] = setTimeout(() => runCampaign(campaignId), 1200);
      return;
    }
    const alreadySent = (latest.logs || []).find(l => l.targetId === target.id && l.status === 'sent');
    if (alreadySent) continue;
    
    await wait(randomBetween(latest.delayMin, latest.delayMax));
    try {
      const result = latest.mode === 'auto'
        ? await ipcRenderer.invoke('zalo-switch-and-send', target.name, latest.message, { profileId: latest.profileId })
        : { ok: true, assisted: true, message: 'Assist mode: đã lưu log, bạn tự mở đúng hội thoại để gửi.' };
      const refreshed = workspaceData.campaigns.find((entry) => entry.id === campaignId);
      refreshed.logs.push({ id: `${Date.now()}-${target.id}`, targetId: target.id, targetName: target.name, status: result.ok ? 'sent' : 'failed', detail: result.message || '', createdAt: Date.now() });
      persistWorkspace();
      trackEvent(result.ok ? 'zalo_campaign_sent' : 'zalo_campaign_failed', { campaignId, targetId: target.id });
      renderCampaigns();
    } catch (err) {
      const refreshed = workspaceData.campaigns.find((entry) => entry.id === campaignId);
      refreshed.logs.push({ id: `${Date.now()}-${target.id}`, targetId: target.id, targetName: target.name, status: 'failed', detail: err.message || String(err), createdAt: Date.now() });
      persistWorkspace();
      trackEvent('zalo_campaign_failed', { campaignId, targetId: target.id });
    }
  }
  updateCampaign(campaignId, { status: 'done' });
  trackEvent('zalo_campaign_done', { id: campaignId });
}
async function runZaloAccountsCampaign(campaignId) {
  const campaign = workspaceData.campaigns.find((entry) => entry.id === campaignId);
  const zaloProfiles = getZaloProfiles().filter((profile) => (campaign.profileIds || []).includes(profile.id));
  if (!zaloProfiles.length) return updateCampaign(campaignId, { status: 'failed' });
  for (const profile of zaloProfiles) {
    const latest = workspaceData.campaigns.find((entry) => entry.id === campaignId);
    if (!latest || latest.status === 'stopped') break;
    if (latest.status === 'paused') {
      campaignTimers[campaignId] = setTimeout(() => runZaloAccountsCampaign(campaignId), 1200);
      return;
    }
    activeProfileId = profile.id;
    switchProfile(profile.id);
    await wait(1800);
    await wait(randomBetween(latest.delayMin, latest.delayMax));
    const message = latest.message.replace(/\{account\}/g, profile.name || 'Zalo');
    const result = await ipcRenderer.invoke('active-chat-send-text', message, { platform: 'zalo', profileId: profile.id });
    const refreshed = workspaceData.campaigns.find((entry) => entry.id === campaignId);
    refreshed.accountLogs = refreshed.accountLogs || [];
    refreshed.accountLogs.push({ id: `${Date.now()}-${profile.id}`, profileId: profile.id, profileName: profile.name, status: result.ok ? 'sent' : 'failed', detail: result.message || '', createdAt: Date.now() });
    persistWorkspace();
    trackEvent(result.ok ? 'zalo_account_campaign_sent' : 'zalo_account_campaign_failed', { campaignId, profileId: profile.id });
    renderCampaigns();
  }
  updateCampaign(campaignId, { status: 'done' });
  trackEvent('zalo_accounts_campaign_done', { id: campaignId });
}
function pauseCampaign(campaignId) { updateCampaign(campaignId, { status: 'paused' }); trackEvent('campaign_paused', { id: campaignId }); }
function stopCampaign(campaignId) {
  if (campaignTimers[campaignId]) clearTimeout(campaignTimers[campaignId]);
  updateCampaign(campaignId, { status: 'stopped' });
  trackEvent('campaign_stopped', { id: campaignId });
}

function renderQuickReplies() {
  const quickReplies = workspaceData.quickReplies || [];
  const list = document.getElementById('quick-replies-list');
  if (!quickReplies.length) {
    list.innerHTML = '<div class="empty-state">Chưa có tin nhắn mẫu nào.</div>';
    return;
  }
  list.innerHTML = quickReplies.map((reply, index) => `
    <div class="download-item">
      <div class="row"><div class="title-sm">/${index + 1}</div><div><button class="modal-btn cancel" data-edit="${index}">Sửa</button><button class="modal-btn warn" data-delete="${index}">Xóa</button></div></div>
      <div class="muted mt-12">${escapeHtml(reply.message)}</div>
    </div>`).join('');
  list.querySelectorAll('[data-edit]').forEach((button) => {
    button.onclick = () => {
      const index = Number(button.getAttribute('data-edit'));
      const next = prompt('Sửa quick reply', workspaceData.quickReplies[index].message);
      if (next && next.trim()) {
        workspaceData.quickReplies[index].message = next.trim();
        persistWorkspace();
        trackEvent('quick_reply_updated', { index });
        renderQuickReplies();
      }
    };
  });
  list.querySelectorAll('[data-delete]').forEach((button) => {
    button.onclick = () => {
      const index = Number(button.getAttribute('data-delete'));
      workspaceData.quickReplies.splice(index, 1);
      persistWorkspace();
      trackEvent('quick_reply_deleted', { index });
      renderQuickReplies();
    };
  });
}
function addQuickReplyFromInput() {
  const input = document.getElementById('quick-reply-input');
  const message = input.value.trim();
  if (!message) return;
  workspaceData.quickReplies.push({ message });
  persistWorkspace();
  trackEvent('quick_reply_created', { length: workspaceData.quickReplies.length });
  input.value = '';
  renderQuickReplies();
  renderDashboard();
}

function renderDownloads() {
  const list = document.getElementById('downloads-list');
  if (!list) return;
  if (!downloads.length) {
    list.innerHTML = '<p class="download-meta">Chưa có file tải xuống.</p>';
    return;
  }
  list.innerHTML = downloads.slice().reverse().map((d) => {
    const pct = d.totalBytes ? Math.round((d.receivedBytes / d.totalBytes) * 100) : (d.status === 'completed' ? 100 : 0);
    return `<div class="download-item"><div class="title-sm">${escapeHtml(d.filename || 'download')}</div><div class="download-meta">${escapeHtml(d.statusText || d.status || '')} ${pct ? `• ${pct}%` : ''}</div><div class="progress mt-12"><span style="width:${pct}%"></span></div><div class="row mt-12"><button class="modal-btn cancel" data-folder="${d.id}">Thư mục</button><div><button class="modal-btn cancel" data-open="${d.id}">Mở</button><button class="modal-btn warn" data-remove="${d.id}">Xóa</button></div></div></div>`;
  }).join('');
  list.querySelectorAll('[data-open]').forEach((btn) => btn.onclick = () => ipcRenderer.send('open-download', btn.getAttribute('data-open')));
  list.querySelectorAll('[data-folder]').forEach((btn) => btn.onclick = () => ipcRenderer.send('show-download-in-folder', btn.getAttribute('data-folder')));
  list.querySelectorAll('[data-remove]').forEach((btn) => btn.onclick = () => {
    ipcRenderer.send('remove-download', btn.getAttribute('data-remove'));
    downloads = downloads.filter((item) => item.id !== btn.getAttribute('data-remove'));
    renderDownloads();
  });
}
function renderUpdate() {
  document.getElementById('update-status').innerText = updateState.message || 'Sẵn sàng kiểm tra cập nhật.';
  document.getElementById('update-progress').style.width = `${updateState.progress || 0}%`;
  document.getElementById('update-download').style.display = updateState.status === 'available' ? 'inline-flex' : 'none';
  document.getElementById('update-install').style.display = updateState.status === 'downloaded' ? 'inline-flex' : 'none';
}

function fillAISettings() {
  document.getElementById('ai-endpoint').value = workspaceData.aiSettings.endpoint || localStorage.getItem('AI_ENDPOINT') || '';
  document.getElementById('ai-api-key').value = workspaceData.aiSettings.apiKey || localStorage.getItem('AI_API_KEY') || '';
  document.getElementById('ai-model').value = workspaceData.aiSettings.model || 'gpt-4o-mini';
}
function saveAISettings() {
  workspaceData.aiSettings = {
    endpoint: document.getElementById('ai-endpoint').value.trim(),
    apiKey: document.getElementById('ai-api-key').value.trim(),
    model: document.getElementById('ai-model').value.trim() || 'gpt-4o-mini',
  };
  localStorage.setItem('AI_ENDPOINT', workspaceData.aiSettings.endpoint);
  localStorage.setItem('AI_API_KEY', workspaceData.aiSettings.apiKey);
  persistWorkspace();
  trackEvent('ai_settings_saved', { endpoint: workspaceData.aiSettings.endpoint });
  document.getElementById('ai-status').innerText = 'Đã lưu cấu hình';
}
async function runAIRewrite() {
  saveAISettings();
  const text = document.getElementById('ai-input').value.trim();
  if (!text) return alert('Nhập nội dung cần rewrite trước.');
  document.getElementById('ai-status').innerText = 'Đang xử lý...';
  const result = await ipcRenderer.invoke('ai-rewrite', {
    endpoint: workspaceData.aiSettings.endpoint,
    apiKey: workspaceData.aiSettings.apiKey,
    model: workspaceData.aiSettings.model,
    text,
    mode: document.getElementById('ai-mode').value,
  });
  if (!result.ok) {
    document.getElementById('ai-status').innerText = result.message || 'Lỗi';
    return;
  }
  document.getElementById('ai-output').value = result.text || '';
  document.getElementById('ai-status').innerText = 'Hoàn tất';
  trackEvent('ai_rewrite', { mode: document.getElementById('ai-mode').value });
}

function renderAll() {
  renderSidebar();
  renderDashboard();
  renderWorkspaces();
  renderCRMCurrentChat();
  renderCampaigns();
  renderQuickReplies();
  renderDownloads();
  renderUpdate();
  fillAISettings();
}

avatarPreview.onclick = () => avatarInput.click();
document.getElementById('avatar-clear').onclick = () => { tempAvatarPath = null; tempAvatarOptOut = true; updateAvatarPreview(); };
avatarInput.onchange = (e) => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      tempAvatarPath = ev.target.result;
      tempAvatarOptOut = false;
      updateAvatarPreview();
    };
    reader.readAsDataURL(file);
  }
};
platformInput.addEventListener('change', () => {
  updateAvatarPreview();
  const customUrlInput = document.getElementById('profile-custom-url-input');
  customUrlInput.style.display = (platformInput.value === 'custom') ? 'block' : 'none';
});
// DS-005 custom platform picker — reuse BRAND_SVG_REAL, giữ platformInput.value API
const PLATFORM_ORDER = [
  ['zalo','Zalo'], ['telegram','Telegram'], ['messenger','Messenger'],
  ['fanpage','FB Fanpage'], ['facebook','Facebook'], ['whatsapp','WhatsApp'],
  ['discord','Discord'], ['teams','Microsoft Teams'], ['gmail','Google / Gmail'],
  ['threads','Threads'], ['x','X / Twitter'], ['instagram','Instagram'],
  ['linkedin','LinkedIn'], ['slack','Slack'], ['skype','Skype'],
  ['custom','Custom Link'],
];
const ppTrigger = document.getElementById('pp-trigger');
const ppListbox = document.getElementById('pp-listbox');
const ppTriggerIcon = document.getElementById('pp-trigger-icon');
const ppTriggerLabel = document.getElementById('pp-trigger-label');
let ppActiveIndex = 0;
// DS-006: Zalo wordmark (BRAND_SVG_REAL.zalo) chứa chữ "Zalo" trong path → 18px
// đọc thành "Zalo Zalo" khi cộng label. Picker dùng glyph Z, sidebar/avatar giữ wordmark.
// ponytail: text Z, không thêm path/lib. Đổi sang SVG Z khi cần pixel-perfect.
const PP_ZALO_MINI = '<span class="pp-z" aria-hidden="true">Z</span>';
function ppIcon(v) { if (v === 'zalo') return PP_ZALO_MINI; return BRAND_SVG_REAL[v] || BRAND_SVG_REAL.custom; }
function ppRender() {
  if (!ppListbox || !ppTriggerIcon || !ppTriggerLabel) return;
  const cur = platformInput.value || 'zalo';
  ppListbox.innerHTML = '';
  PLATFORM_ORDER.forEach(([v, label], i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'pp-item'; b.setAttribute('role', 'option');
    b.dataset.value = v; b.dataset.index = i;
    b.setAttribute('aria-selected', String(v === cur));
    b.dataset.active = String(i === ppActiveIndex);
    b.innerHTML = `<span class="pp-item-icon">${ppIcon(v)}</span>`
      + `<span class="pp-item-label">${label}</span><span class="pp-check">✓</span>`;
    b.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    b.onclick = () => ppSelect(v);
    ppListbox.appendChild(b);
  });
  ppTriggerIcon.innerHTML = ppIcon(cur);
  ppTriggerIcon.querySelector('svg')?.setAttribute('aria-hidden', 'true');
  ppTriggerLabel.textContent = (PLATFORM_ORDER.find(([v]) => v === cur) || ['', 'Custom Link'])[1];
}
function ppOpen() {
  ppActiveIndex = Math.max(0, PLATFORM_ORDER.findIndex(([v]) => v === (platformInput.value || 'zalo')));
  ppRender();
  ppListbox.hidden = false;
  ppTrigger.setAttribute('aria-expanded', 'true');
  ppPosition();
  window.addEventListener('resize', ppPosition);
  document.addEventListener('scroll', ppOnScroll, true); // capture: modal-box + window
  ppListbox.querySelector(`[data-index="${ppActiveIndex}"]`)?.focus();
  document.addEventListener('pointerdown', ppOutside, true);
}
function ppClose(focusTrigger = true) {
  if (!ppListbox) return;
  ppListbox.hidden = true;
  ppTrigger.setAttribute('aria-expanded', 'false');
  window.removeEventListener('resize', ppPosition);
  document.removeEventListener('scroll', ppOnScroll, true);
  document.removeEventListener('pointerdown', ppOutside, true);
  if (focusTrigger) ppTrigger.focus();
}
function ppOutside(e) { if (!document.getElementById('platform-picker').contains(e.target)) ppClose(false); }
// DS-007: listbox fixed theo trigger — thoát .modal-box overflow:auto
function ppPosition() {
  if (!ppListbox || ppListbox.hidden) return;
  const r = ppTrigger.getBoundingClientRect();
  const gap = 6, maxH = 220;
  const below = window.innerHeight - r.bottom;
  const flip = below < 180 && r.top > below; // gần đáy viewport → mở lên trên
  const h = Math.min(maxH, ppListbox.scrollHeight || maxH);
  const top = flip ? Math.max(8, r.top - h - gap) : r.bottom + gap;
  const avail = Math.max(120, Math.min(maxH, (flip ? r.top - 16 : below - 16)));
  Object.assign(ppListbox.style, { left: r.left + 'px', width: r.width + 'px', top: top + 'px', maxHeight: avail + 'px' });
}
function ppOnScroll() {
  const r = ppTrigger.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight) ppClose(false); // modal scroll quá xa → đóng
  else ppPosition(); // scroll/resize nhẹ → bám theo trigger
}
function ppSelect(v) {
  if (platformInput.value !== v) {
    platformInput.value = v;
    platformInput.dispatchEvent(new Event('change', { bubbles: true }));
  }
  ppRender(); ppClose();
}
if (ppTrigger && ppListbox) {
  ppTrigger.onclick = () => (ppListbox.hidden ? ppOpen() : ppClose(false));
  ppTrigger.onkeydown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ppOpen(); }
  };
  ppListbox.onkeydown = (e) => {
    const items = () => [...ppListbox.querySelectorAll('.pp-item')];
    if (e.key === 'Escape') { e.preventDefault(); ppClose(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ppSelect(items()[ppActiveIndex]?.dataset.value); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      ppActiveIndex = (ppActiveIndex + (e.key === 'ArrowDown' ? 1 : -1) + items().length) % items().length;
      ppRender(); items()[ppActiveIndex]?.focus();
    } else if (e.key === 'Home') { e.preventDefault(); ppActiveIndex = 0; ppRender(); items()[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); ppActiveIndex = items().length - 1; ppRender(); items().at(-1)?.focus(); }
  };
  ppRender();
}
nameInput.addEventListener('input', updateAvatarPreview);

document.querySelectorAll('[data-close]').forEach((button) => { button.onclick = () => closeOverlay(button.getAttribute('data-close')); });
document.getElementById('btn-add-profile').onclick = () => openModal();
document.getElementById('modal-cancel').onclick = () => closeOverlay('modal-overlay');
document.getElementById('modal-delete').onclick = () => {
  if (!editingProfile) return;
  if (profiles.length <= 1) return alert('Phải có ít nhất 1 tài khoản.');
  if (!confirm(`Xóa tài khoản ${editingProfile.name}?`)) return;
  profiles = profiles.filter((profile) => profile.id !== editingProfile.id);
  ipcRenderer.send('delete-profile', editingProfile.id);
  activeProfileId = profiles[0]?.id || null;
  persistWorkspace();
  trackEvent('profile_deleted', { id: editingProfile.id });
  closeOverlay('modal-overlay');
  renderAll();
  if (activeProfileId) switchProfile(activeProfileId);
};
document.getElementById('modal-save').onclick = () => {
  const name = nameInput.value.trim() || `Tài khoản ${profiles.length + 1}`;
  const customUrl = document.getElementById('profile-custom-url-input').value.trim();
  if (platformInput.value === 'custom' && !customUrl) return alert('Vui lòng nhập URL cho Custom Link.');
  if (editingProfile) {
    const nextPlatform = platformInput.value;
    const previousPlatform = editingProfile.platform || 'zalo';
    editingProfile.name = name;
    editingProfile.proxy = proxyInput.value.trim();
    editingProfile.platform = nextPlatform;
    editingProfile.avatar = tempAvatarPath;
    editingProfile.avatarOptOut = tempAvatarOptOut || !tempAvatarPath;
    editingProfile.customUrl = nextPlatform === 'custom' ? customUrl : '';
    if (previousPlatform !== nextPlatform) {
      editingProfile.partition = createProfilePartition(editingProfile.id, nextPlatform);
    }
    ipcRenderer.send('update-profile-settings', editingProfile);
    trackEvent('profile_updated', { id: editingProfile.id });
  } else {
    const id = createProfileId();
    const platform = platformInput.value;
    profiles.push({ id, name, avatar: tempAvatarPath, avatarOptOut: tempAvatarOptOut || !tempAvatarPath, partition: createProfilePartition(id, platform), platform, proxy: proxyInput.value.trim(), customUrl: platform === 'custom' ? customUrl : '' });
    activeProfileId = id;
    trackEvent('profile_created', { id });
  }
  persistWorkspace();
  closeOverlay('modal-overlay');
  renderAll();
  if (activeProfileId) switchProfile(activeProfileId);
};

document.getElementById('btn-tools-launcher').onclick = () => setLauncherOpen(!toolsLauncherOpen);
document.getElementById('tools-close').onclick = () => setLauncherOpen(false);
document.querySelectorAll('[data-tools-close="true"]').forEach((el) => {
  el.onclick = () => setLauncherOpen(false);
});
document.querySelectorAll('[data-tool-action]').forEach((el) => {
  el.onclick = () => runToolAction(el.dataset.toolAction, true);
});
document.getElementById('workspace-create-btn').onclick = () => {
  const input = document.getElementById('workspace-name-input');
  const name = input.value.trim() || 'Workspace mới';
  workspaceState = ipcRenderer.sendSync('workspace-create', name);
  workspaceData = normalizeWorkspaceData(workspaceState.data);
  profiles = normalizeProfiles(workspaceData.profiles);
  activeProfileId = profiles[0]?.id || null;
  input.value = '';
  trackEvent('workspace_created', { name });
  closeOverlay('workspace-overlay');
  renderAll();
  if (activeProfileId) switchProfile(activeProfileId);
};

document.getElementById('crm-search').addEventListener('input', renderCRMList);
document.getElementById('crm-fill-current').onclick = () => {
  if (!currentChatSnapshot) return alert('Chưa lấy được snapshot tab hiện tại.');
  fillContactForm({ name: currentChatSnapshot.name || '', phone: '', status: 'new', tags: [currentChatSnapshot.platform || ''], note: `Imported từ ${currentChatSnapshot.platform || 'chat'}` });
};
document.getElementById('crm-save').onclick = saveContact;
document.getElementById('crm-delete').onclick = deleteContact;

document.getElementById('campaign-create').onclick = createCampaign;
document.getElementById('campaign-run-active').onclick = () => {
  if (!selectedCampaignId) return alert('Hãy chọn campaign trước.');
  runCampaign(selectedCampaignId);
};

document.getElementById('quick-reply-add').onclick = addQuickReplyFromInput;
document.getElementById('quick-reply-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addQuickReplyFromInput();
  }
});

document.getElementById('ai-save-settings').onclick = saveAISettings;
document.getElementById('ai-run').onclick = runAIRewrite;
document.getElementById('ai-copy').onclick = () => {
  clipboard.writeText(document.getElementById('ai-output').value || '');
  document.getElementById('ai-status').innerText = 'Đã copy';
};
document.getElementById('ai-save-quick-reply').onclick = () => {
  const text = document.getElementById('ai-output').value.trim();
  if (!text) return;
  workspaceData.quickReplies.push({ message: text });
  persistWorkspace();
  trackEvent('quick_reply_created_from_ai', {});
  renderQuickReplies();
  document.getElementById('ai-status').innerText = 'Đã lưu vào quick replies';
};

document.getElementById('update-check').onclick = () => ipcRenderer.send('check-for-updates');
document.getElementById('update-download').onclick = () => ipcRenderer.send('download-update');
document.getElementById('update-install').onclick = () => ipcRenderer.send('install-update');

function showLockOverlay(setupMode = false) {
  appLocked = true;
  openOverlay('lock-overlay');
  document.getElementById('lock-password-confirm').style.display = setupMode ? 'block' : 'none';
  document.getElementById('lock-remove').style.display = (!setupMode && hasLockPassword) ? 'block' : 'none';
  document.getElementById('lock-hint').innerText = setupMode ? 'Tạo mật khẩu khóa ứng dụng.' : 'Nhập mật khẩu để mở khóa.';
  document.getElementById('lock-submit').innerText = setupMode ? 'Tạo khóa' : 'Mở khóa';
  document.getElementById('lock-password').value = '';
  document.getElementById('lock-password-confirm').value = '';
}
function hideLockOverlay() {
  appLocked = false;
  closeOverlay('lock-overlay');
}
document.getElementById('lock-submit').onclick = () => {
  const password = document.getElementById('lock-password').value;
  const confirmPassword = document.getElementById('lock-password-confirm').value;
  if (!hasLockPassword) {
    if (!password || password !== confirmPassword) return alert('Mật khẩu không khớp.');
    ipcRenderer.send('set-lock-password', password);
  } else ipcRenderer.send('unlock-app', password);
};
document.getElementById('lock-remove').onclick = () => {
  const password = document.getElementById('lock-password').value;
  if (!password) return alert('Vui lòng nhập mật khẩu hiện tại để gỡ khóa.');
  ipcRenderer.send('remove-lock-password', password);
};
document.getElementById('lock-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('lock-submit').click(); });
document.getElementById('lock-password-confirm').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('lock-submit').click(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && toolsLauncherOpen) {
    e.preventDefault();
    setLauncherOpen(false);
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    ipcRenderer.send('lock-app');
  }
});

ipcRenderer.on('downloads-list', (_, list) => { downloads = list || []; renderDownloads(); });
ipcRenderer.on('download-updated', (_, item) => { downloads = downloads.filter((entry) => entry.id !== item.id).concat(item); renderDownloads(); renderDashboard(); });
ipcRenderer.on('update-state', (_, state) => { updateState = state; renderUpdate(); if (state.status === 'available' || state.status === 'downloaded') openOverlay('update-overlay'); });
ipcRenderer.on('lock-state', (_, state) => {
  hasLockPassword = !!state.hasPassword;
  document.getElementById('btn-shield').classList.toggle('active', !!state.zadarkShield);
  if (state.locked) showLockOverlay(!hasLockPassword);
});
ipcRenderer.on('unlock-result', (_, result) => { 
  if (result.ok) { 
    if (result.removed) { hasLockPassword = false; alert('Đã gỡ mật khẩu khóa ứng dụng thành công!'); }
    else hasLockPassword = true; 
    hideLockOverlay(); 
  } else alert(result.message || 'Sai mật khẩu.'); 
});
ipcRenderer.on('update-profile-badge', (_, { id, count }) => {
  const badge = document.getElementById(`badge-${id}`);
  if (badge) {
    badge.innerText = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
});
ipcRenderer.on('update-profile-info', (_, payload) => {
  const profile = profiles.find((entry) => entry.id === payload.id);
  if (!profile) return;
  let changed = false;
  if (payload.name && profile.name.startsWith('Tài khoản')) { profile.name = payload.name; changed = true; }
  if (payload.avatarUrl && !profile.avatar && !profile.avatarOptOut) { profile.avatar = payload.avatarUrl; changed = true; }
  if (changed) {
    persistWorkspace();
    renderSidebar();
  }
});
ipcRenderer.on('current-chat-info', (_, info) => {
  currentChatSnapshot = info;
  renderCRMCurrentChat();
});

const settings = ipcRenderer.sendSync('get-settings');
isDarkMode = settings.isDarkMode;
hasLockPassword = !!settings.hasLockPassword;
document.body.className = isDarkMode ? 'dark-mode' : 'light-mode';
const sunIcon = document.getElementById('icon-sun');
const moonIcon = document.getElementById('icon-moon');
if (sunIcon) sunIcon.style.display = isDarkMode ? 'none' : 'block';
if (moonIcon) moonIcon.style.display = isDarkMode ? 'block' : 'none';
document.getElementById('btn-pin').classList.toggle('active', !!settings.alwaysOnTop);
const shieldButton = document.getElementById('btn-shield');
if (shieldButton) shieldButton.classList.toggle('active', !!settings.zadarkShield);



migrateLegacyProfiles();
renderAll();
if (activeProfileId) switchProfile(activeProfileId);
ipcRenderer.send('renderer-ready');
ipcRenderer.send('get-downloads');

ipcRenderer.on('recent-chats', (event, info) => {
  if (info.profileId === activeProfileId) {
    workspaceData.recentChats = sanitizeRecentChats(info.chats);
    if (currentCampaignTargetSource === 'recent') {
      renderCampaignTargets('recent');
    }
  }
});

if (settings.lockOnStartup) showLockOverlay(!hasLockPassword);
