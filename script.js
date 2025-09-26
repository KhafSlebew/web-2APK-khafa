// --- Utility & DOM ready wrapper ---
const $ = id => document.getElementById(id);

// Generate stars
function createStars() {
  const starsContainer = document.getElementById('stars');
  const starsCount = 150;

  for (let i = 0; i < starsCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');

    // Random position and size
    const size = Math.random() * 3;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;

    // Random animation delay
    star.style.animationDelay = `${Math.random() * 5}s`;

    starsContainer.appendChild(star);
  }
}

// Wait DOM
window.addEventListener('DOMContentLoaded', () => {
  createStars();

  // Element references
  const settingsBtn = $('settingsBtn');
  const settingsModal = $('settingsModal');
  const closeSettings = $('closeSettings');
  const profileUpload = $('profileUpload');
  const saveProfile = $('saveProfile');
  const profileImg = $('profileImg');

  const form = $('builderForm');
  const progr = $('progress');
  const result = $('result');
  const btn = $('submitBtn');
  const progText = $('progText');
  const progBar = $('progBar');
  const errorAlert = $('errorAlert');
  const errorMsg = $('errorMsg');
  const uploadStatus = $('uploadStatus');

  // Modal controls
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
  });

  closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove('active');
  });

  // Save profile picture (local)
  saveProfile.addEventListener('click', () => {
    const file = profileUpload.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        showError('File harus berupa gambar (PNG/JPG)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showError('Ukuran file maksimal 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        profileImg.src = e.target.result;
        // Save to localStorage
        localStorage.setItem('profilePicture', e.target.result);
        settingsModal.classList.remove('active');
        showSuccess('Foto profil berhasil diubah!');
      };
      reader.readAsDataURL(file);
    } else {
      showError('Pilih foto terlebih dahulu');
    }
  });

  // Load saved profile picture
  const savedProfile = localStorage.getItem('profilePicture');
  if (savedProfile) profileImg.src = savedProfile;

  // --- Alerts ---
  function showError(message) {
    errorMsg.textContent = message;
    errorAlert.classList.remove('hidden');
    setTimeout(() => errorAlert.classList.add('hidden'), 5000);
  }

  function showSuccess(message) {
    const successAlert = document.createElement('div');
    successAlert.className = 'alert';
    successAlert.style.borderLeftColor = 'var(--success)';
    successAlert.style.background = 'rgba(34, 197, 94, 0.1)';
    successAlert.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

    document.querySelector('.card').insertBefore(successAlert, document.getElementById('builderForm'));

    setTimeout(() => successAlert.remove(), 3000);
  }

  // --- Image upload logic (tries multiple services) ---
  async function uploadIcon(file) {
    uploadStatus.classList.remove('hidden');
    uploadStatus.textContent = 'Mengunggah ikon...';
    uploadStatus.className = 'upload-status';

    const uploadServices = [
      {
        name: 'ImgBB',
        url: 'https://api.imgbb.com/1/upload?key=c091a0b0a1ad72abae72cd25ec9af866',
        method: 'POST',
        body: (file) => {
          const formData = new FormData();
          formData.append('image', file);
          return formData;
        },
        processResponse: async (response) => {
          const data = await response.json();
          return data.data.url;
        }
      },
      {
        name: 'Catbox',
        url: 'https://catbox.moe/user/api.php',
        method: 'POST',
        body: (file) => {
          const formData = new FormData();
          formData.append('fileToUpload', file);
          formData.append('reqtype', 'fileupload');
          return formData;
        },
        processResponse: async (response) => {
          return await response.text();
        }
      },
      {
        name: 'UploadCC',
        url: 'https://upload.cc/index.php/upload',
        method: 'POST',
        body: (file) => {
          const formData = new FormData();
          formData.append('uploaded_file[]', file);
          return formData;
        },
        processResponse: async (response) => {
          const data = await response.json();
          if (data.success && data.files && data.files.length > 0) {
            return `https://upload.cc/${data.files[0].hash}`;
          }
          throw new Error('Upload gagal');
        }
      }
    ];

    for (const service of uploadServices) {
      try {
        uploadStatus.textContent = `Mencoba mengunggah ke ${service.name}...`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(service.url, {
          method: service.method,
          body: service.body(file),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const imageUrl = await service.processResponse(response);

        if (!imageUrl) throw new Error('Tidak mendapatkan URL gambar');

        uploadStatus.textContent = `Berhasil mengunggah ke ${service.name}`;
        uploadStatus.classList.add('status-success');
        return imageUrl;
      } catch (error) {
        console.warn(`Upload ke ${service.name} gagal:`, error);
      }
    }

    throw new Error('Semua layanan upload gambar gagal. Silakan coba lagi nanti.');
  }

  // Progress animation helper
  function animateProgress(tMin = 3) {
    const total = tMin * 60 * 1000;
    const start = Date.now();
    const iv = setInterval(() => {
      const elap = Date.now() - start;
      const pct = Math.min(90, Math.round((elap / total) * 100));
      progBar.style.width = pct + '%';
      if (pct === 90) clearInterval(iv);
    }, 1000);
    return () => clearInterval(iv);
  }

  // Form submit handler
  form.addEventListener('submit', async e => {
    e.preventDefault();
    btn.disabled = true;
    errorAlert.classList.add('hidden');
    progr.classList.remove('hidden');
    result.classList.add('hidden');
    const stopProg = animateProgress(3);

    try {
      const url = $('url').value.trim();
      const appName = $('appName').value.trim();
      const email = $('email').value.trim();
      const imgFile = $('iconFile').files[0];

      if (!imgFile) throw new Error('Pilih ikon dulu');

      try {
        new URL(url);
      } catch (e) {
        throw new Error('URL tidak valid');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) throw new Error('Format email tidak valid');

      progText.textContent = 'Mengunggah ikon…';
      const iconUrl = await uploadIcon(imgFile);

      progText.textContent = 'Proceessing Builder…';
      const apiUrl = 'https://api.fikmydomainsz.xyz/tools/toapp/build-complete' +
        '?url=' + encodeURIComponent(url) +
        '&email=' + encodeURIComponent(email) +
        '&appName=' + encodeURIComponent(appName) +
        '&appIcon=' + encodeURIComponent(iconUrl);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 374600);
      const response = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const job = await response.json();
      if (!job.status) throw new Error(job.error || 'Build gagal');

      stopProg();
      progBar.style.width = '100%';

      $('dlApk').href = job.downloadUrl;
      $('keyInfo').textContent =
        `storePass : ${job.storePass}
keyPass   : ${job.keyPass}
keySha    : ${job.keySha}
package   : ${job.packageName}`;
      progr.classList.add('hidden');
      result.classList.remove('hidden');

    } catch (err) {
      stopProg();
      progr.classList.add('hidden');
      btn.disabled = false;
      showError('Error: ' + err.message);
      console.error(err);
    }
  });

  // Icon file change preview/status
  $('iconFile').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        showError('File harus berupa gambar (PNG/JPG)');
        this.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showError('Ukuran file maksimal 5MB');
        this.value = '';
        return;
      }

      uploadStatus.classList.remove('hidden');
      uploadStatus.textContent = 'File siap diunggah: ' + file.name;
      uploadStatus.className = 'upload-status status-success';
    }
  });

});