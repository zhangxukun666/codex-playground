const lines = [
  '想和你一起数星星，也想陪你看日出。',
  '世界很大，我只想和你一起探险。',
  '把心跳写成信，寄给在意的你。',
  '想要和你分享的，不止是今天的日落。',
  '说不出口的话，就写在这里吧。',
];

const sampleConfessions = [
  {
    from: '阿树',
    to: '星星',
    message: '如果你也喜欢我，就眨一下眼睛；如果不喜欢，我就等到你喜欢为止。',
    likes: 21,
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
  },
  {
    from: '橙子',
    to: '林同学',
    message: '想带你去看海，去看雪，去看每一场烟火，也去看镜子里未来的我们。',
    likes: 35,
    timestamp: Date.now() - 1000 * 60 * 60 * 14,
  },
  {
    from: 'Zoe',
    to: '小陈',
    message: '从喜欢你开始，风都变得更温柔了。',
    likes: 15,
    timestamp: Date.now() - 1000 * 60 * 40,
  },
];

const listEl = document.getElementById('confession-list');
const form = document.getElementById('confession-form');
const countEl = document.getElementById('count');
const typewriter = document.getElementById('typewriter');
const randomBtn = document.getElementById('random-line');
const filterButtons = document.querySelectorAll('.chip');

let confessions = [...sampleConfessions];
let activeFilter = 'latest';
let typeIndex = 0;
let charIndex = 0;
let typingTimeout;

function formatTime(timestamp) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

function renderCount() {
  countEl.textContent = confessions.length;
}

function renderList() {
  const sorted = [...confessions].sort((a, b) => {
    if (activeFilter === 'popular') return b.likes - a.likes;
    return b.timestamp - a.timestamp;
  });

  listEl.innerHTML = sorted
    .map(
      (item) => `
        <article class="confession">
          <div class="actions">
            <span class="tag">${formatTime(item.timestamp)}</span>
            <button class="heart" data-ts="${item.timestamp}">❤️ ${item.likes}</button>
          </div>
          <h3>${item.from} 写给 ${item.to}</h3>
          <p class="message">${item.message}</p>
          <p class="meta">愿望：希望 ${item.to} 能收到这封温柔的喜欢。</p>
        </article>
      `,
    )
    .join('');

  listEl.querySelectorAll('.heart').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ts = Number(btn.dataset.ts);
      const target = confessions.find((c) => c.timestamp === ts);
      if (target) {
        target.likes += 1;
        btn.textContent = `❤️ ${target.likes}`;
      }
    });
  });
}

function handleSubmit(event) {
  event.preventDefault();
  const from = document.getElementById('from').value.trim() || '匿名';
  const to = document.getElementById('to').value.trim() || '心上人';
  const message = document.getElementById('message').value.trim();
  if (!message) return;

  confessions.unshift({
    from,
    to,
    message,
    likes: 0,
    timestamp: Date.now(),
  });

  form.reset();
  renderCount();
  renderList();
}

function startTypewriter() {
  clearTimeout(typingTimeout);
  const currentLine = lines[typeIndex % lines.length];
  if (charIndex <= currentLine.length) {
    typewriter.textContent = currentLine.slice(0, charIndex);
    charIndex += 1;
    typingTimeout = setTimeout(startTypewriter, 80);
  } else {
    typingTimeout = setTimeout(() => {
      charIndex = 0;
      typeIndex += 1;
      startTypewriter();
    }, 1800);
  }
}

function showRandomLine() {
  const random = lines[Math.floor(Math.random() * lines.length)];
  typewriter.textContent = random;
  charIndex = random.length + 1;
}

function bindFilters() {
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      filterButtons.forEach((b) => b.classList.toggle('active', b === btn));
      renderList();
    });
  });
  filterButtons[0].classList.add('active');
}

form.addEventListener('submit', handleSubmit);
randomBtn.addEventListener('click', showRandomLine);

bindFilters();
renderCount();
renderList();
startTypewriter();
