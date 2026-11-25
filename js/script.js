  (function(){
  'use strict';
  const $=(id)=>document.getElementById(id);
  const state = {
    mode: 'login',
    role: 'patient',
    user: null,
    service: 'Chăm sóc người bệnh tại nhà',
    recordTab: 'timeline',
    students: [],
    requests: null,
    records: null
  };
  const roleNames = {
    patient: 'Người bệnh / Người nhà',
    staff: 'Bác sĩ / Điều dưỡng',
    student: 'Sinh viên hỗ trợ'
  };

  const roleDescriptions = {
    patient: 'Quản lý hồ sơ sức khỏe, đặt dịch vụ và kết nối chăm sóc.',
    staff: 'Tiếp nhận người bệnh, quản lý ca và thực hiện chăm sóc.',
    student: 'Nhận ca hỗ trợ và đồng hành cùng người bệnh tại bệnh viện.'
  };
  const STORE={users:'mnv2_users',session:'mnv2_session',requests:'mnv2_requests',contact:'mnv2_emergency_contact',profile:'mnv2_profile',records:'mnv2_records'};
  function safeParse(value,fallback){try{return JSON.parse(value)||fallback}catch(e){return fallback}}
  function getStore(key,fallback){return safeParse(localStorage.getItem(key),fallback)}
  function setStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){toast('Không thể lưu dữ liệu trên trình duyệt này.');return false}}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200)}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function dateLabel(date){if(!date)return 'Chưa chọn ngày';const d=new Date(date+'T12:00:00');return Number.isNaN(d.getTime())?date:d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}
  function openAuth(mode) {
    state.mode = mode || 'login';

    $('authLayer').classList.remove('hidden');
    $('roleChoices').classList.remove('hidden');
    $('authForm').classList.add('hidden');

    $('authTitle').textContent =
      state.mode === 'register'
        ? 'Tạo tài khoản MEDINEX'
        : 'Chào mừng bạn trở lại';

    $('authDescription').textContent =
      'Chọn vai trò để tiếp tục.';
  }

  function closeAuth() {
    $('authLayer').classList.add('hidden');
  }

  function updateAuthForm() {
    const isRegister = state.mode === 'register';
    const role = state.role;

    $('authTitle').textContent = isRegister
      ? 'Tạo tài khoản'
      : 'Đăng nhập tài khoản';

    $('authDescription').textContent =
      roleDescriptions[role];

    $('nameLabel').classList.toggle(
      'hidden',
      !isRegister
    );

    $('authName').classList.toggle(
      'hidden',
      !isRegister
    );

    $('authName').required = isRegister;

    $('authPassword').autocomplete =
      isRegister
        ? 'new-password'
        : 'current-password';

    $('authSubmit').textContent =
      isRegister
        ? 'Tạo tài khoản →'
        : 'Đăng nhập →';

    $('authSwitchText').textContent =
      isRegister
        ? 'Đã có tài khoản?'
        : 'Chưa có tài khoản?';

    $('authSwitch').textContent =
      isRegister
        ? 'Đăng nhập'
        : 'Đăng ký';
  }

  document
    .querySelectorAll('[data-open-auth]')
    .forEach(button => {
      button.addEventListener(
        'click',
        () => openAuth(button.dataset.openAuth)
      );
    });

  document
    .querySelectorAll('[data-close-auth]')
    .forEach(button => {
      button.addEventListener(
        'click',
        closeAuth
      );
    });

  document
    .querySelectorAll('[data-role]')
    .forEach(button => {

      button.addEventListener(
        'click',
        () => {

          state.role =
            button.dataset.role;

          $('roleChoices')
            .classList.add('hidden');

          $('authForm')
            .classList.remove('hidden');

          $('authName').value = '';
          $('authEmail').value = '';
          $('authPassword').value = '';

          updateAuthForm();
        }
      );

    });

  $('backRoles').addEventListener(
    'click',
    () => {

      $('roleChoices')
        .classList.remove('hidden');

      $('authForm')
        .classList.add('hidden');

    }
  );

  $('authSwitch').addEventListener(
    'click',
    () => {

      state.mode =
        state.mode === 'register'
          ? 'login'
          : 'register';

      updateAuthForm();

    }
  );
  $('authForm').addEventListener('submit', async e => {
    e.preventDefault();

    const email =
      $('authEmail').value.trim().toLowerCase();

    const password =
      $('authPassword').value;

    const name =
      $('authName').value.trim();

    if (!email || !password) {
      toast('Vui lòng nhập email và mật khẩu.');
      return;
    }

    if (state.mode === 'register' && !name) {
      toast('Vui lòng nhập họ và tên.');
      return;
    }

    const submitBtn =
      $('authSubmit');

    submitBtn.disabled = true;

    try {
  if (state.mode === 'register') {
    const {
      data,
      error
    } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (error) {
      toast(error.message);
      return;
    }

    if (!data.user) {
      toast('Không thể tạo tài khoản.');
      return;
    }

    let session = data.session;

    if (!session) {
      const {
        data: sessionData,
        error: sessionError
      } = await supabaseClient.auth.getSession();

      if (sessionError) {
        console.error(
          'MEDINEX Session Error:',
          sessionError
        );

        toast(
          'Tài khoản đã tạo nhưng chưa thể khởi tạo phiên đăng nhập.'
        );

        return;
      }

      session = sessionData.session;
    }

    if (!session) {
      toast(
        'Tài khoản đã tạo nhưng chưa có phiên đăng nhập.'
      );

      return;
    }

    console.log(
      'MEDINEX SIGNUP USER:',
      data.user
    );

    console.log(
      'MEDINEX SIGNUP SESSION:',
      session
    );

    const {
      error: profileError
    } = await supabaseClient
      .from('profiles')
      .insert({
        id: data.user.id,
        name,
        email,
        role: state.role,
        avatar_initial:
          name.charAt(0).toUpperCase()
      });

    console.log(
      'MEDINEX PROFILE INSERT ERROR:',
      profileError
    );

    if (profileError) {
      console.error(
        'MEDINEX Profile Insert Error:',
        profileError
      );

      toast(
        'Tạo tài khoản thành công nhưng chưa lưu được hồ sơ: ' +
        profileError.message
      );

      return;
    }

    state.user = {
      id: data.user.id,
      email,
      name,
      role: state.role
    };

    closeAuth();
    showApp();

    toast(
      'Đã tạo tài khoản MEDINEX TECH thành công.'
    );

  } else {
        const {
          data,
          error
        } = await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          toast(
            'Đăng nhập thất bại: ' +
            error.message
          );
          return;
        }

        if (!data.user) {
          toast('Không tìm thấy tài khoản.');
          return;
        }

        const {
          data: profile,
          error: profileError
        } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          toast(
            'Không tìm thấy hồ sơ người dùng.'
          );
          return;
        }

        if (profile.role !== state.role) {
          toast(
            'Vai trò tài khoản không khớp với vai trò bạn đã chọn.'
          );
          await supabaseClient.auth.signOut();
          return;
        }

        state.user = {
          id: data.user.id,
          email: profile.email,
          name: profile.name,
          role: profile.role
        };

        closeAuth();
        showApp();

        toast(
          'Đăng nhập MEDINEX TECH thành công.'
        );
      }

    } catch (error) {
      console.error(
        'MEDINEX Auth Error:',
        error
      );

      toast(
        'Có lỗi kết nối đến hệ thống xác thực.'
      );

    } finally {
      submitBtn.disabled = false;
    }
  });
  function showApp(options = {}) {
    if (!state.user) {
      return;
    }

    $('home').classList.add('hidden');
    $('app').classList.remove('hidden');
    document.body.classList.add('app-mode');

    const initials =
      (state.user.name || 'M')
        .trim()
        .charAt(0)
        .toUpperCase();

    $('topUserName').textContent =
      state.user.name;

    $('topUserRole').textContent =
      roleNames[state.user.role];

    $('userAvatar').textContent =
      initials;

    $('dropdownAvatar').textContent =
      initials;

    $('dropdownUserName').textContent =
      state.user.name;

    $('dropdownUserEmail').textContent =
      state.user.email;

    $('greeting').textContent =
      'Xin chào, ' +
      state.user.name.split(' ')[0] +
      ' 👋';

    $('todayLabel').textContent =
      new Date().toLocaleDateString(
        'vi-VN',
        {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }
      );

    $('profileAvatar').textContent =
      initials;

    $('profileName').textContent =
      state.user.name;

    $('profileRole').textContent =
      roleNames[state.user.role];

    $('profileNameInput').value =
      state.user.name;

    $('profileEmailInput').value =
      state.user.email;

    $('profileRoleInput').value =
      roleNames[state.user.role];

    const emergencyContacts =
      getStore(STORE.contact, {});

    const emergencyContact =
      emergencyContacts[state.user.email];

    const emergencyRow =
      $('setEmergencyContact')
        ?.closest('.emergency-row');

    if (emergencyRow) {
      const contactText =
        emergencyRow.querySelector('small');

      if (emergencyContact) {
        contactText.textContent =
          emergencyContact.name +
          ' · ' +
          emergencyContact.phone;
      } else {
        contactText.textContent =
          'Chưa thiết lập số liên hệ';
      }
    }

    $('hcDate').min = todayISO();
    $('hcDate').value = todayISO();

    $('stDate').min = todayISO();
    $('stDate').value = todayISO();

    state.recordTab = 'timeline';

  document
    .querySelectorAll('[data-record-tab]')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.recordTab === 'timeline'
      );
    });

  renderStudents();
  renderRecords();
  renderRecordProfile();
  loadSupabaseRecords();
  renderRequests();
  loadSupabaseRequests();

    if (options.restoreRoute === true) {
      restoreAppRoute();
    } else {
      goPage('overview', false);

      history.replaceState(
        { page: 'overview' },
        '',
        '#app/overview'
      );
    }
  }
  function closeAccountMenu(){const menu=$('accountDropdown');if(menu)menu.hidden=true;$('userMenu').setAttribute('aria-expanded','false')}
  async function logout() {
    if (!state.user) {
      return;
    }

    if (
      !confirm(
        'Bạn có chắc chắn muốn đăng xuất khỏi MEDINEX TECH?'
      )
    ) {
      return;
    }

    closeAccountMenu();

    try {
      const {
        error
      } = await supabaseClient.auth.signOut();

      if (error) {
        toast(
          'Đăng xuất thất bại: ' +
          error.message
        );
        return;
      }

      state.user = null;
      state.requests = null;
      state.records = null;

      localStorage.removeItem(
      STORE.session
      );

      $('app').classList.add('hidden');
      $('home').classList.remove('hidden');
      $('sidebar').classList.remove('mobile-open');
      document.body.classList.remove('app-mode');

      toast('Đã đăng xuất khỏi MEDINEX TECH.');

    } 
    catch (error) {
      console.error(
        'MEDINEX Logout Error:',
        error
      );

      toast(
        'Có lỗi khi đăng xuất.'
      );
    }
  }
  $('sidebarLogout').addEventListener('click',logout);
$('userMenu').addEventListener('click',e=>{
  e.stopPropagation();
  const menu=$('accountDropdown');
  menu.hidden=!menu.hidden;
  $('userMenu').setAttribute(
    'aria-expanded',
    String(!menu.hidden)
  );
});
$('dropdownProfile').addEventListener('click',()=>{
  closeAccountMenu();
  goPage('profile');
});


document.addEventListener('click',e=>{
  if(!$('accountMenuWrap').contains(e.target)){
    closeAccountMenu();
  }
});

$('notifications').addEventListener(
  'click',
  ()=>toast('Bạn chưa có thông báo mới trong bản demo.')
);
  function goPage(page, updateHistory = true) {
  const allowedPages = [
  'overview',
  'services',
  'notifications',
  'homecare',
  'students',
  'records',
  'sos',
  'requests',
  'profile',
  'doctor-consult',
  'doctor-chat'
];
    document.querySelectorAll('.app-bottom-item[data-app-nav]').forEach(button => {
  button.classList.toggle(
    'active',
    button.dataset.appNav === page
  );
});
    if (!allowedPages.includes(page)) {
      page = 'overview';
    }

    /*
    * RESET:
    * Tắt toàn bộ page trước khi bật page mới.
    * Không dùng toggle để tránh trường hợp nhiều page
    * cùng active.
    */
    document
      .querySelectorAll('.page[data-page-content]')
      .forEach((section) => {
        section.classList.remove('active');
      });

    /*
    * ACTIVE:
    * Chỉ bật đúng page hiện tại.
    */
    const targetPage = document.querySelector(
      `.page[data-page-content="${page}"]`
    );

    if (targetPage) {
      targetPage.classList.add('active');
    }

    /*
    * SIDEBAR:
    * Chỉ một nút được active.
    */
    document
      .querySelectorAll('.side-link[data-page]')
      .forEach((button) => {
        button.classList.remove('active');
      });

    const targetSideLink = document.querySelector(
      `.side-link[data-page="${page}"]`
    );

    if (targetSideLink) {
      targetSideLink.classList.add('active');
    }

    /*
    * BOTTOM NAV:
    * Đồng bộ trạng thái với trang App hiện tại.
    */
    document
      .querySelectorAll('.app-bottom-item[data-app-nav]')
      .forEach((button) => {
        button.classList.toggle(
          'active',
          button.dataset.appNav === page
        );
      });

    /*
    * MOBILE SIDEBAR
    */
    $('sidebar').classList.remove('mobile-open');

    /*
    * RENDER DATA
    */
    if (page === 'requests') {
      renderRequests();
    }

    if (page === 'records') {
      renderRecords();
    }

    /*
    * URL
    */
    const nextHash = `#app/${page}`;

    if (updateHistory && location.hash !== nextHash) {
      history.pushState(
        { page },
        '',
        nextHash
      );
    }

    /*
    * Scroll lên đầu trang
    */
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  window.addEventListener('popstate',()=>{
  if(!state.user)return;
const match=location.hash.match(/^#app\/(overview|services|notifications|homecare|students|records|sos|requests|profile)$/);
  if(match)goPage(match[1],false);
  });
  window.addEventListener('hashchange', () => {
  if (!state.user) return;

  const match = location.hash.match(
    /^#app\/(overview|services|notifications|homecare|students|records|sos|requests|profile|doctor-consult|doctor-chat)$/
  );

  if (match) {
    goPage(match[1], false);
  }
});

  document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.page)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.go)));$('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('mobile-open'));document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();closeAccountMenu();$('sidebar').classList.remove('mobile-open')}});
document.querySelectorAll('[data-app-nav]').forEach(button => {
  button.addEventListener('click', () => {
    const page = button.dataset.appNav;

    if (page === 'services') {
      goPage('services');
      return;
    }

    if (page === 'notifications') {
      goPage('notifications');
      return;
    }

    goPage(page);
  });
});
  function getRequests() {
    if (!state.user) {
      return [];
    }

    const allRequests =
      state.requests !== null
        ? state.requests
        : getStore(STORE.requests, []);

    if (state.user.role === 'staff') {
      return allRequests;
    }

    if (state.user.role === 'student') {
      return allRequests.filter(
        request =>
          request.kind === 'Thuê sinh viên'
      );
    }

    return allRequests.filter(
      request =>
        request.ownerId === state.user.id ||
        request.owner === state.user.email
    );
  }
  async function loadSupabaseRequests() {
    if (!state.user?.id) {
      return;
    }

    try {
      const {
        data,
        error
      } = await supabaseClient
        .from('requests')
        .select('*')
        .order('created_at', {
          ascending: false
        });

      if (error) {
        console.error(
          'MEDINEX Request Load Error:',
          error
        );

        return;
      }

      const normalizedRequests =
        (data || []).map(row => ({
          id: row.id,
          ownerId: row.owner_id,
          owner: row.owner_id,

          kind: row.kind,
          title: row.title || '',
          hospital: row.hospital || '',
          service: row.service || '',
          studentId: row.student_id || '',
          task: row.task || '',

          date:
            row.request_date ||
            '',

          time:
            row.shift ||
            '',

          note:
            row.note ||
            '',

          status:
            row.status ||
            'Chờ xác nhận (demo)',

          createdAt:
            row.created_at,

          updatedAt:
            row.updated_at
        }));

      state.requests =
        normalizedRequests;

      setStore(
        STORE.requests,
        normalizedRequests
      );

      renderRequests();

      console.log(
        'MEDINEX REQUESTS LOADED:',
        normalizedRequests
      );

    } catch (error) {
      console.error(
        'MEDINEX Request Load Sync Error:',
        error
      );
    }
  }
  async function addRequest(request) {
    const requestId =
      'MN-' +
      Date.now().toString().slice(-8);

    const createdAt =
      new Date().toISOString();

    const localRequest = {
      ...request,
      owner: state.user.email,
      id: requestId,
      createdAt,
      status: 'Chờ xác nhận (demo)'
    };

    // Giữ localStorage để giao diện hiện tại
    // vẫn hoạt động bình thường.
    const all =
      getStore(STORE.requests, []);

    all.unshift(localRequest);

    setStore(
      STORE.requests,
      all
    );

    // Nếu chưa đăng nhập thì chỉ lưu local.
    if (!state.user?.id) {
      return localRequest;
    }

    try {
      const {
        data,
        error
      } = await supabaseClient
        .from('requests')
        .insert({
          owner_id: state.user.id,
          kind: request.kind || '',
          title: request.title || '',
          hospital: request.hospital || '',
          service: request.service || '',
          student_id: request.studentId || '',
          task: request.task || '',
          request_date:
          request.requestDate ||
          request.date ||
          null,
          shift:
    request.shift ||
    request.time ||
    '',
          note: request.note || '',
          status: 'Chờ xác nhận (demo)'
        })
        .select()
        .single();

      if (error) {
        console.error(
          'MEDINEX Request Insert Error:',
          error
        );

        toast(
          'Đã lưu yêu cầu trên máy, nhưng chưa đồng bộ lên hệ thống.'
        );

        return localRequest;
      }

    console.log(
    'MEDINEX REQUEST SAVED:',
    data
  );

  // Sau khi Supabase tạo request thành công,
  // dùng ID thật của Supabase làm ID chính.
  localRequest.id = data.id;
  localRequest.ownerId = state.user.id;

  // Đồng bộ lại localStorage với ID thật.
  const syncedRequests =
    getStore(STORE.requests, []);

  const localIndex =
    syncedRequests.findIndex(
      request =>
        String(request.id) ===
        String(requestId)
    );

  if (localIndex >= 0) {
    syncedRequests[localIndex] = {
      ...localRequest
    };

    setStore(
      STORE.requests,
      syncedRequests
    );
  }

  return localRequest;

    } catch (error) {
      console.error(
        'MEDINEX Request Sync Error:',
        error
      );

      toast(
        'Đã lưu yêu cầu trên máy, nhưng chưa đồng bộ lên hệ thống.'
      );

      return localRequest;
    }
  }
    function renderRequests() {
        const isStaff =
      state.user &&
      state.user.role === 'staff';

    const requests =
    getRequests();
    const upcoming =
    $('upcomingAppointment');

  if (upcoming) {
    if (!requests.length) {
      upcoming.innerHTML = `
        <div class="patient-empty-icon">
          ◷
        </div>

        <div>
          <b>
            Chưa có lịch hẹn sắp tới
          </b>

          <p>
            Khi bạn đặt dịch vụ hoặc có lịch tư vấn
            được xác nhận, thông tin sẽ xuất hiện tại đây.
          </p>
        </div>
      `;
    } else {
      const upcomingRequest =
        requests.find(
          request =>
            request.date &&
            request.date >= todayISO()
        ) || requests[0];

      upcoming.innerHTML = `
        <div class="patient-empty-icon">
          ${
            upcomingRequest.kind ===
            'Thuê sinh viên'
              ? '♙'
              : '⌂'
          }
        </div>

        <div>
          <b>
            ${esc(
              upcomingRequest.kind ||
              'Yêu cầu dịch vụ'
            )}
          </b>

          <p>
            ${esc(
              upcomingRequest.title ||
              'Yêu cầu mới'
            )}
            ${
              upcomingRequest.date
                ? ' · ' +
                  esc(
                    dateLabel(
                      upcomingRequest.date
                    )
                  )
                : ''
            }
            ${
              upcomingRequest.time
                ? ' · ' +
                  esc(
                    upcomingRequest.time
                  )
                : ''
            }
          </p>

          <span class="request-status">
            ${
              upcomingRequest.status ===
              'Chờ xác nhận (demo)'
                ? 'Chờ xác nhận'
                : esc(
                    upcomingRequest.status ||
                    'Đang xử lý'
                  )
            }
          </span>
        </div>
      `;
    }
  }
      const target=$('allRequests'),recent=$('recentRequests');if(!requests.length){target.innerHTML='<div class="empty-inline">Chưa có yêu cầu nào được lưu.</div>';recent.innerHTML='<div class="empty-state"><span>◷</span><b>Chưa có yêu cầu nào</b><small>Khi bạn đặt dịch vụ, thông tin sẽ xuất hiện tại đây.</small></div>';return}const make = (r, withDelete) => `
    <article class="request-item">
      <span class="request-type-icon">
        ${r.kind === 'Thuê sinh viên' ? '♙' : '⌂'}
      </span>

      <div class="request-content">
        <div class="request-heading">
          <b>
            ${esc(r.kind)} · ${esc(r.title)}
          </b>

          <span class="request-status">
    ${
      r.status === 'Chờ xác nhận (demo)'
        ? 'Chờ xác nhận'
        : esc(r.status)
    }
  </span>
        </div>

        <p>
          ${esc(dateLabel(r.date))}
          ${r.time ? ' · ' + esc(r.time) : ''}
          ${r.hospital ? ' · ' + esc(r.hospital) : ''}
          <br>
          ${esc(r.note || 'Không có ghi chú')}
        </p>

        <small class="request-code">
          Mã yêu cầu · ${esc(r.id)}
        </small>
      </div>
  ${
  state.user &&
  r.status === 'Chờ xác nhận (demo)' &&
  (
    (
      state.user.role === 'staff' &&
      r.kind !== 'Thuê sinh viên'
    ) ||
    (
      state.user.role === 'student' &&
      r.kind === 'Thuê sinh viên'
    )
  )
      ? `
        <button
          type="button"
          class="btn btn-primary btn-sm"
          data-confirm-request="${esc(r.id)}"
        >
          Xác nhận
        </button>
      `
      : ''
  }
  ${
    state.user &&
    state.user.role === 'patient' &&
    r.status === 'Đã xác nhận'
      ? `
        <button
          type="button"
          class="btn btn-outline request-contact-btn"
          data-request-payment="${esc(r.id)}"
        >
          Liên hệ & thanh toán
        </button>
      `
      : ''
  }
  ${
    state.user &&
    state.user.role === 'student' &&
    r.status === 'Đã xác nhận'
      ? `
        <span class="request-payment-status">
          Thanh toán:
          <b>
            ${esc(r.paymentStatus || 'Chưa thanh toán')}
          </b>
        </span>
      `
      : ''
  }
      ${
        withDelete
          ? `
            <button
            type="button"
              class="request-delete"
              data-delete-request="${esc(r.id)}"
              aria-label="Xóa yêu cầu"
            >
              Xóa
            </button>
          `
          : ''
      }
    </article>
    `;
  target.innerHTML =
    requests.map(r => make(r, true)).join('');

  recent.innerHTML =
    requests.slice(0, 2).map(r => make(r, false)).join('');


  target.querySelectorAll('[data-delete-request]').forEach(
    button => {
      button.addEventListener('click', () => {
        const modal = $('deleteRequestModal');

        modal.dataset.requestId =
          button.dataset.deleteRequest;

        modal.setAttribute(
          'aria-hidden',
          'false'
        );
      });
    }
  );
  target
    .querySelectorAll('[data-confirm-request]')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          const requestId =
            button.dataset.confirmRequest;

          if (!requestId) {
            toast(
              'Không xác định được yêu cầu.'
            );
            return;
          }

          const {
            data,
            error
          } = await supabaseClient
            .from('requests')
            .update({
              status: 'Đã xác nhận'
            })
            .eq('id', requestId)
            .select()
            .single();

          if (error) {
            console.error(
              'MEDINEX Request Update Error:',
              error
            );

            toast(
              'Không thể cập nhật yêu cầu trên hệ thống.'
            );

            return;
          }

          console.log(
            'MEDINEX REQUEST UPDATED:',
            data
          );

          await loadSupabaseRequests();

          toast(
            'Đã xác nhận yêu cầu của người bệnh.'
          );
        }
      );
    });
  }
  let pendingHomecareData = null;

  $('homecareForm').addEventListener('submit', e => {
    e.preventDefault();

    const form = e.currentTarget;
    const submitBtn = form.querySelector('[type="submit"]');

    if (submitBtn.disabled) return;

    const f = new FormData(form);

    const data = {
      kind: 'Y tế tại nhà',
      title: state.service,
      name: String(f.get('name') || '').trim(),
      phone: String(f.get('phone') || '').trim(),
      address: String(f.get('address') || '').trim(),
      date: String(f.get('date') || ''),
      time: String(f.get('time') || ''),
      note: String(f.get('notes') || '').trim()
    };

    /* ===== KIỂM TRA THÔNG TIN ===== */

    if (
      !data.name ||
      !data.phone ||
      !data.address ||
      !data.date ||
      !data.time
    ) {
      toast('Vui lòng kiểm tra các trường bắt buộc.');
      return;
    }

    const normalizedPhone = data.phone.replace(/[\s().-]/g, '');

    if (!/^(\+84|84|0)(3|5|7|8|9)\d{8}$/.test(normalizedPhone)) {
      toast('Số điện thoại chưa đúng định dạng.');
      return;
    }

    if (data.date < todayISO()) {
      toast('Ngày đặt dịch vụ không được ở trong quá khứ.');
      return;
    }

    if (!data.title) {
      toast('Vui lòng chọn loại dịch vụ.');
      return;
    }

    /* ===== LƯU TẠM, CHƯA GHI LOCALSTORAGE ===== */

    pendingHomecareData = data;

    /* ===== ĐỔ DỮ LIỆU VÀO MODAL ===== */

    $('confirmService').textContent = data.title;
    $('confirmName').textContent = data.name;
    $('confirmPhone').textContent = data.phone;
    $('confirmAddress').textContent = data.address;
    $('confirmDate').textContent = data.date;
    $('confirmTime').textContent = data.time;
    $('confirmNote').textContent = data.note || 'Không có ghi chú';

    /* ===== MỞ MODAL ===== */

    const modal = $('homecareConfirm');

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  });
  /* ===== HOMECARE CONFIRMATION ===== */

  $('confirmHomecareBtn').addEventListener(
    'click',
    async () => {
      if (!pendingHomecareData) {
        return;
      }

      const savedRequest = {
        ...pendingHomecareData
      };

      const saved =
    await addRequest(savedRequest);

  if (!saved) {
    return;
  }

  // Đồng bộ dữ liệu mới nhất từ Supabase
  // trước khi hiển thị trạng thái yêu cầu.
  await loadSupabaseRequests();

  const latestRequest =
    getRequests().find(
      request =>
        String(request.id) ===
        String(saved.id)
    );

  if (latestRequest) {
    $('homecareStatusTitle').textContent =
      latestRequest.title;

    $('homecareStatusDate').textContent =
      latestRequest.date;

    $('homecareStatusTime').textContent =
      latestRequest.time;

    $('homecareStatusId').textContent =
      'Mã yêu cầu: ' +
      latestRequest.id;

    const statusBox =
      $('homecareRequestStatus');

    statusBox.hidden = false;
  }

  pendingHomecareData = null;

  $('homecareConfirm').setAttribute(
    'aria-hidden',
    'true'
  );

  renderRequests();

  toast(
    'Đã lưu yêu cầu demo. Chưa gửi đến nhà cung cấp dịch vụ.'
  );

  goPage('requests');
    }
  );


  /* ===== ĐÓNG HOMECARE CONFIRMATION ===== */

  document.querySelectorAll('[data-homecare-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = $('homecareConfirm');

      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');

      pendingHomecareData = null;
    });
  });
  document.querySelectorAll('[data-care-service]').forEach(b => {
    b.addEventListener('click', () => {
      state.service = b.dataset.careService;

      document.querySelectorAll('[data-care-service]').forEach(x => {
        x.classList.toggle('selected', x === b);
      });

      toast('Đã chọn dịch vụ: ' + state.service);
    });
  });
  const studentData = [
    {
      id: 's1',
      name: 'Nguyễn Thị Mai Anh',
      school: 'SV Y khoa · Năm 3',
      skills: 'Giao tiếp tốt, chăm sóc người bệnh',
      tasks: ['Chăm sóc người bệnh', 'Theo dõi sau xuất viện'],
      experience: '2 tháng hoạt động hỗ trợ cộng đồng',
      availability: 'Ca sáng (07:00–11:30)',
      hospital: 'Bệnh viện Đại học Y Dược Buôn Ma Thuột',
      initial: 'MA'
    },
    {
      id: 's2',
      name: 'Trần Minh Đức',
      school: 'SV Y khoa · Năm 4',
      skills: 'Kiên nhẫn, hỗ trợ di chuyển',
      tasks: ['Hỗ trợ di chuyển', 'Đưa đón người bệnh'],
      experience: '3 tháng hoạt động tình nguyện',
      availability: 'Ca chiều (13:00–17:00)',
      hospital: 'Bệnh viện Đa khoa vùng Tây Nguyên',
      initial: 'Đ'
    },
    {
      id: 's3',
      name: 'Lê Hoàng Yến',
      school: 'SV Y khoa · Năm 3',
      skills: 'Tận tâm, hỗ trợ sinh hoạt',
      tasks: ['Hỗ trợ sinh hoạt', 'Chăm sóc người bệnh'],
      experience: '1 tháng hoạt động cộng đồng',
      availability: 'Ca sáng (07:00–11:30)',
      hospital: 'Bệnh viện Đa khoa tỉnh Đắk Lắk',
      initial: 'HY'
    }
  ];
  function renderStudents(){const hospital=$('stHospital').value,shift=$('stShift').value,task=$('stTask').value;let list = studentData.filter(s => {
    const hospitalMatch =
      hospital === 'all' || s.hospital === hospital;

    const shiftMatch =
      shift === 'all' || s.availability === shift;

    const taskMatch =
      task === 'all' || s.tasks.includes(task);

    return hospitalMatch && shiftMatch && taskMatch;
  });
  $('studentCount').textContent=`${list.length} hồ sơ minh họa phù hợp`;const host=$('studentList');if(!list.length){host.innerHTML='<div class="panel empty-inline">Không có hồ sơ mẫu phù hợp bộ lọc. Thử thay đổi lựa chọn.</div>';return}host.innerHTML=list.map(s=>`<article class="student-card"><div class="student-top"><div class="student-avatar">${esc(s.initial)}</div><div><h3>${esc(s.name)}</h3><p>${esc(s.school)}</p><span class="available-pill">● Có thể gửi yêu cầu</span></div></div><div class="student-details"><div>♧ <b>Kỹ năng:</b> ${esc(s.skills)}</div><div>✦ <b>Có thể hỗ trợ:</b> ${esc(s.tasks.join(' · '))}</div><div>◷ <b>Kinh nghiệm:</b> ${esc(s.experience)}</div><div>⌖ <b>Cơ sở mong muốn:</b> ${esc(s.hospital)}</div><div>▦ <b>Khung giờ mẫu:</b> ${esc(s.availability)}</div></div><div class="student-actions"><button class="btn btn-outline" data-student-profile="${s.id}">Xem hồ sơ</button><button class="btn btn-primary" data-hire-student="${s.id}">Chọn người thuê</button></div></article>`).join('')}
  $('studentFilter').addEventListener('submit',e=>{e.preventDefault();renderStudents();toast('Đã cập nhật danh sách hồ sơ mẫu.')});
  function openHireRequestModal({
    student,
    task,
    date,
    shift,
    hospital
  }) {
    if (!student) return;

    $('hireRequestStudent').textContent =
      `${student.name} · ${student.school}`;

    $('hireRequestTask').textContent = task;
    $('hireRequestDate').textContent = dateLabel(date);
    $('hireRequestShift').textContent = shift;
    $('hireRequestHospital').textContent = hospital;

    const modal = $('hireRequestModal');

    modal.dataset.studentId = student.id;
    modal.dataset.task = task;
    modal.dataset.date = date;
    modal.dataset.shift = shift;
    modal.dataset.hospital = hospital;

    modal.setAttribute(
      'aria-hidden',
      'false'
    );
  }
  function hireStudent(id){const s=studentData.find(x=>x.id===id);if(!s)return;const date=$('stDate').value||todayISO();const task=$('stTask').value==='all'?'Hỗ trợ tại viện':$('stTask').value;const shift=$('stShift').value==='all'?s.availability:$('stShift').value;const hospital=$('stHospital').value==='all'?s.hospital:$('stHospital').value;openHireRequestModal({
    student: s,
    task,
    date,
    shift,
    hospital
  });
  }

  document.addEventListener('click',e=>{const hire=e.target.closest('[data-hire-student]');if(hire){hireStudent(hire.dataset.hireStudent);return}const prof = e.target.closest('[data-student-profile]');

  if (prof) {
    const s = studentData.find(
      x => x.id === prof.dataset.studentProfile
    );

    if (!s) return;

    $('studentProfileName').textContent = s.name;
    $('studentProfileSchool').textContent = s.school;
    $('studentProfileAvatar').textContent = s.initial;
    $('studentProfileSkills').textContent = s.skills;
    $('studentProfileExperience').textContent = s.experience;
    $('studentProfileHospital').textContent = s.hospital;
    $('studentProfileAvailability').textContent = s.availability;

    const taskHost = $('studentProfileTasks');

    taskHost.innerHTML = (s.tasks || []).map(task => `
      <span class="student-profile-tag">
        ${esc(task)}
      </span>
    `).join('');

    $('studentProfileModal').setAttribute(
      'aria-hidden',
      'false'
    );

    return;
  }
  });
  document.querySelectorAll('[data-delete-request-close]').forEach(
    button => {
      button.addEventListener('click', () => {
        $('deleteRequestModal').setAttribute(
          'aria-hidden',
          'true'
        );
      });
    }
  );

  const deleteRequestConfirm =
    $('deleteRequestConfirm');

  if (deleteRequestConfirm) {
    deleteRequestConfirm.addEventListener(
      'click',
      async () => {
        const modal =
          $('deleteRequestModal');

        const requestId =
          modal.dataset.requestId;

        if (!requestId) {
          toast(
            'Không xác định được yêu cầu cần xóa.'
          );
          return;
        }

        const requests =
          getStore(STORE.requests, []);

        const request =
          requests.find(
            item =>
              String(item.id) ===
              String(requestId)
          );

      const isOwner =
    request &&
    (
      request.ownerId === state.user.id ||
      request.owner === state.user.email
    );

  if (request && !isOwner) {
    toast(
      'Bạn không có quyền xóa yêu cầu này.'
    );
    return;
  }

        try {
          /*
          * Nếu request đã được đồng bộ lên Supabase,
          * ID sẽ là UUID.
          *
          * Request MN-... chỉ là bản local fallback.
          */
          if (
            state.user?.id &&
            requestId &&
            !String(requestId).startsWith('MN-')
          ) {
            const {
    error
  } = await supabaseClient
    .from('requests')
    .delete()
    .eq('id', requestId)
    .eq('owner_id', state.user.id);

            if (error) {
              console.error(
                'MEDINEX Request Delete Error:',
                error
              );

              toast(
                'Không thể xóa yêu cầu trên hệ thống.'
              );

              return;
            }
          }

          const newRequests =
            requests.filter(
              item =>
                String(item.id) !==
                String(requestId)
            );

          setStore(
            STORE.requests,
            newRequests
          );

          state.requests =
            state.requests
              ? state.requests.filter(
                  item =>
                    String(item.id) !==
                    String(requestId)
                )
              : null;

          delete modal.dataset.requestId;

          modal.setAttribute(
            'aria-hidden',
            'true'
          );

          renderRequests();

          toast(
            'Đã xóa yêu cầu.'
          );

        } catch (error) {
          console.error(
            'MEDINEX Request Delete Sync Error:',
            error
          );

          toast(
            'Có lỗi khi xóa yêu cầu.'
          );
        }
      }
    );
  }
  const PAYMENT_CONFIG = {
    amount: 150000,
    qrUrl:
      'https://img.vietqr.io/image/MB-0000301512395-compact2.svg' +
      '?amount=150000' +
      '&addInfo=Thanh%20toan%20dich%20vu' +
      '&accountName=Tran%20Tan'
  };

  function openRequestPayment(requestId) {
    const requests =
    getRequests();

    const request =
      requests.find(
        r =>
          String(r.id) ===
          String(requestId)
      );

    if (!request) {
      toast('Không tìm thấy yêu cầu.');
      return;
    }

    if (request.status !== 'Đã xác nhận') {
      toast('Yêu cầu chưa được xác nhận.');
      return;
    }

    let providerName =
      request.title ||
      'MEDINEX TECH';

    let providerRole =
      request.kind === 'Thuê sinh viên'
        ? 'Sinh viên BMU hỗ trợ'
        : 'Dịch vụ chăm sóc sức khỏe';

    let providerHospital =
      request.hospital ||
      'MEDINEX TECH';

    if (
      request.kind === 'Thuê sinh viên' &&
      request.studentId
    ) {
      const student =
        studentData.find(
          s =>
            s.id === request.studentId
        );

      if (student) {
        providerName =
          student.name;

        providerRole =
          student.school;

        providerHospital =
          student.hospital;
      }
    }

    const paymentModal =
      $('requestPaymentModal');

    if (!paymentModal) {
      toast('Không tìm thấy cửa sổ thanh toán.');
      return;
    }

    $('paymentProviderName').textContent =
      providerName;

    $('paymentProviderRole').textContent =
      providerRole;

    $('paymentProviderHospital').textContent =
      providerHospital;

    $('paymentRequestId').textContent =
      request.id;

    $('paymentAmount').textContent =
      PAYMENT_CONFIG.amount.toLocaleString('vi-VN') +
      ' đ';

    $('paymentTransferNote').textContent =
      'Thanh toan dich vu';

    $('paymentQrImage').src =
      PAYMENT_CONFIG.qrUrl;

    $('paymentContactButton').onclick =
      () => {
        toast(
          `Liên hệ: ${providerName} · ${providerHospital}`
        );
      };

    paymentModal.setAttribute(
      'aria-hidden',
      'false'
    );
  }
  document.addEventListener(
    'click',
    e => {
      const button =
        e.target.closest(
          '[data-request-payment]'
        );

      if (!button) return;

      openRequestPayment(
        button.dataset.requestPayment
      );
    }
  );


  document.querySelectorAll(
    '[data-request-payment-close]'
  ).forEach(button => {
    button.addEventListener(
      'click',
      () => {
        const modal =
          $('requestPaymentModal');

        modal.classList.remove('show');

        modal.setAttribute(
          'aria-hidden',
          'true'
        );
      }
    );
  });
  document.querySelectorAll('[data-student-profile-close]').forEach(
    button => {
      button.addEventListener('click', () => {
        $('studentProfileModal').setAttribute(
          'aria-hidden',
          'true'
        );
      });
    }
  );

  document.querySelectorAll('[data-hire-request-close]').forEach(
    button => {
      button.addEventListener('click', () => {
        $('hireRequestModal').setAttribute(
          'aria-hidden',
          'true'
        );
      });
    }
  );

  $('hireRequestConfirm').addEventListener('click', async () => {
    const modal = $('hireRequestModal');

    const studentId = modal.dataset.studentId;
    const task = modal.dataset.task;
    const date = modal.dataset.date;
    const shift = modal.dataset.shift;
    const hospital = modal.dataset.hospital;

    if (!studentId) return;

    const s = studentData.find(
      student => student.id === studentId
    );

    if (!s) return;

    const saved = await addRequest({
    kind: 'Thuê sinh viên',
    title: s.name,
    note: task,
    date,
    time: shift,
    hospital,
    studentId: s.id
  });

  if (!saved) {
    return;
  }

  await loadSupabaseRequests();

  modal.setAttribute(
    'aria-hidden',
    'true'
  );

  renderRequests();

  toast(
    'Đã lưu yêu cầu thuê sinh viên demo. Chưa gửi cho sinh viên thật.'
  );

  goPage('requests');
  });

  $('studentProfileHire').addEventListener('click', () => {
    const name = $('studentProfileName').textContent;

    const s = studentData.find(
      student => student.name === name
    );

    if (!s) return;

    $('studentProfileModal').setAttribute(
      'aria-hidden',
      'true'
    );

    hireStudent(s.id);
  });

  $('clearRequests').addEventListener(
    'click',
    async () => {
      if (
        !confirm(
          'Xóa toàn bộ lịch sử yêu cầu demo của tài khoản này?'
        )
      ) {
        return;
      }

      if (!state.user?.id) {
        return;
      }

      try {
        const {
          error
        } = await supabaseClient
          .from('requests')
          .delete()
          .eq(
            'owner_id',
            state.user.id
          );

        if (error) {
          console.error(
            'MEDINEX Clear Requests Error:',
            error
          );

          toast(
            'Không thể xóa lịch sử trên hệ thống.'
          );

          return;
        }

        const remainingRequests =
          getStore(
            STORE.requests,
            []
          ).filter(
            request =>
              request.owner !==
              state.user.email &&
              request.ownerId !==
              state.user.id
          );

        setStore(
          STORE.requests,
          remainingRequests
        );

        state.requests =
          state.requests
            ? state.requests.filter(
                request =>
                  request.ownerId !==
                    state.user.id &&
                  request.owner !==
                    state.user.email
              )
            : null;

        renderRequests();

        toast(
          'Đã xóa toàn bộ lịch sử yêu cầu.'
        );

      } catch (error) {
        console.error(
          'MEDINEX Clear Requests Sync Error:',
          error
        );

        toast(
          'Có lỗi khi xóa lịch sử yêu cầu.'
        );
      }
    }
  );
  const defaultRecordContent = {
    timeline: [
      [
        'Hôm nay · 08:45',
        'Cập nhật tình trạng minh họa',
        'Thông tin mẫu về theo dõi huyết áp và dùng thuốc theo hướng dẫn.',
        'TỪ BẢN DEMO'
      ],
      [
        '26/10/2026 · 15:20',
        'Có lịch tái khám mẫu',
        'Lịch tái khám được hiển thị minh họa, chưa kết nối bệnh viện.',
        'LỊCH HẸN'
      ],
      [
        '24/10/2026 · 09:10',
        'Có kết quả xét nghiệm mẫu',
        'Không phải kết quả của bệnh nhân thật.',
        'KẾT QUẢ'
      ],
      [
        '20/10/2026 · 14:32',
        'Cập nhật thuốc mẫu',
        'Amlodipin 5 mg — nội dung minh họa, không phải chỉ định điều trị.',
        'ĐƠN THUỐC'
      ]
    ],

    meds: [
      [
        'Hiện tại · Bản mẫu',
        'Danh sách thuốc minh họa',
        'Amlodipin 5 mg — ví dụ trình bày. Không dùng để tự điều trị.',
        'DEMO'
      ],
      [
        'Trước đó · Bản mẫu',
        'Hướng dẫn sử dụng thuốc',
        'Thông tin thuốc thật phải lấy từ hồ sơ hợp lệ và người kê đơn.',
        'LƯU Ý'
      ]
    ],

    tests: [
      [
        '24/10/2026 · 09:10',
        'Kết quả xét nghiệm mẫu',
        'Khu vực hiển thị kết quả sẽ kết nối với cơ sở y tế khi triển khai thật.',
        'DEMO'
      ],
      [
        '—',
        'Chưa có dữ liệu thực',
        'Không có kết quả xét nghiệm thật trong phiên bản này.',
        'TRỐNG'
      ]
    ],

    notes: [
      [
        'Bản demo',
        'Ghi chú chăm sóc',
        'Khi có hệ thống thật, chỉ người được cấp quyền mới xem hoặc cập nhật ghi chú.',
        'QUYỀN TRUY CẬP'
      ]
    ]
  };
  async function loadSupabaseRecords() {
    if (!state.user?.id) {
      return null;
    }

    try {
      const {
        data: record,
        error: recordError
      } = await supabaseClient
        .from('patient_records')
        .select(`
          id,
          patient_id,
          name,
          birth_year,
          condition,
          facility,
          created_at,
          updated_at
        `)
        .eq(
          'patient_id',
          state.user.id
        )
        .maybeSingle();

      if (recordError) {
        throw recordError;
      }

      if (!record) {
        return null;
      }

      const {
        data: items,
        error: itemsError
      } = await supabaseClient
        .from('medical_record_items')
        .select(`
          id,
          record_id,
          item_type,
          title,
          content,
          label,
          occurred_at,
          created_at,
          updated_at
        `)
        .eq(
          'record_id',
          record.id
        )
        .order(
          'occurred_at',
          {
            ascending: false,
            nullsFirst: false
          }
        );

      if (itemsError) {
        throw itemsError;
      }

      const records = {
        profile: {
          name:
            record.name ||
            state.user.name ||
            'Người bệnh minh họa',

          birthYear:
            record.birth_year ||
            'Chưa cập nhật',

          condition:
            record.condition ||
            'Chưa cập nhật',

          facility:
            record.facility ||
            'Chưa kết nối'
        },

        timeline: [],
        meds: [],
        tests: [],
        notes: []
      };

      (items || []).forEach(item => {
        const entry = [
          item.occurred_at
            ? new Date(
                item.occurred_at
              ).toLocaleDateString(
                'vi-VN'
              )
            : '—',

          item.title || '',

          item.content || '',

          item.label || ''
        ];

        if (
          item.item_type ===
          'timeline'
        ) {
          records.timeline.push(
            entry
          );
        }

        if (
          item.item_type ===
          'medication'
        ) {
          records.meds.push(
            entry
          );
        }

        if (
          item.item_type ===
          'test'
        ) {
          records.tests.push(
            entry
          );
        }

        if (
          item.item_type ===
          'note'
        ) {
          records.notes.push(
            entry
          );
        }
      });

      state.records = records;

      const allRecords =
        getStore(
          STORE.records,
          {}
        );

      allRecords[
        state.user.email
      ] = records;

      setStore(
        STORE.records,
        allRecords
      );

      renderRecords();
      renderRecordProfile();

      return records;

    } catch (error) {
      console.error(
        'loadSupabaseRecords:',
        error
      );

      return null;
    }
  }
  function getUserRecords() {
    if (!state.user) {
      return {
        profile: {
          name: 'Người bệnh minh họa',
          birthYear: '1958',
          condition: 'Tăng huyết áp (mẫu)',
          facility: 'Chưa kết nối'
        },
        timeline: [],
        meds: [],
        tests: [],
        notes: []
      };
    }

    const allRecords =
    getStore(STORE.records, {});

  let userRecords =
    state.records ||
    allRecords[state.user.email];

    if (!userRecords) {
      userRecords = {
        profile: {
          name:
            state.user.name ||
            'Người bệnh minh họa',

          birthYear: '1958',

          condition:
            'Tăng huyết áp (mẫu)',

          facility:
            'Chưa kết nối'
        },

        timeline:
          JSON.parse(
            JSON.stringify(
              defaultRecordContent.timeline
            )
          ),

        meds:
          JSON.parse(
            JSON.stringify(
              defaultRecordContent.meds
            )
          ),

        tests:
          JSON.parse(
            JSON.stringify(
              defaultRecordContent.tests
            )
          ),

        notes:
          JSON.parse(
            JSON.stringify(
              defaultRecordContent.notes
            )
          )
      };

      allRecords[state.user.email] =
        userRecords;

      setStore(
        STORE.records,
        allRecords
      );

      return userRecords;
    }

  if (!userRecords.timeline) {
    userRecords.timeline =
      JSON.parse(
        JSON.stringify(
          defaultRecordContent.timeline
        )
      );
  }

  if (!userRecords.meds) {
    userRecords.meds =
      JSON.parse(
        JSON.stringify(
          defaultRecordContent.meds
        )
      );
  }

  if (!userRecords.tests) {
    userRecords.tests =
      JSON.parse(
        JSON.stringify(
          defaultRecordContent.tests
        )
      );
  }

  if (!userRecords.notes) {
    userRecords.notes =
      JSON.parse(
        JSON.stringify(
          defaultRecordContent.notes
        )
      );
  }

    if (!userRecords.profile) {
      userRecords.profile = {
        name:
          userRecords.name ||
          state.user.name ||
          'Người bệnh minh họa',

        birthYear:
          userRecords.birthYear ||
          '1958',

        condition:
          userRecords.disease ||
          userRecords.condition ||
          'Tăng huyết áp (mẫu)',

        facility:
          userRecords.facility ||
          'Chưa kết nối'
      };

      delete userRecords.name;
      delete userRecords.birthYear;
      delete userRecords.disease;
      delete userRecords.facility;
    }

    allRecords[state.user.email] =
      userRecords;

    setStore(
      STORE.records,
      allRecords
    );

    return userRecords;
  }

  function renderRecords() {
    const records = getUserRecords();

    const profile =
      records.profile || {};

    const patientName =
      profile.name || 'Người bệnh minh họa';

    const birthYear =
      profile.birthYear || 'Chưa cập nhật';

    const condition =
      profile.condition || 'Chưa cập nhật';

    const facility =
      profile.facility || 'Chưa kết nối';

    const patientNameEl =
      $('recordPatientName');

    if (patientNameEl) {
      patientNameEl.textContent =
        patientName;
    }

    const recordsPage =
    document.querySelector(
      '[data-page-content="records"]'
    );

  const patientFacts =
    recordsPage
      ? recordsPage.querySelectorAll(
          '.patient-facts span'
        )
      : [];

    if (patientFacts.length >= 3) {
      patientFacts[0].innerHTML =
        `♙ <b>Ngày sinh:</b> ${esc(birthYear)}`;

      patientFacts[1].innerHTML =
        `♡ <b>Bệnh lý:</b> ${esc(condition)}`;

      patientFacts[2].innerHTML =
        `⌂ <b>Cơ sở:</b> ${esc(facility)}`;
    }

    const items =
      records[state.recordTab] ||
      records.timeline ||
      [];

    $('recordContent').innerHTML =
      items.map(x => `
        <div class="timeline-item">
          <div class="timeline-date">
            ${esc(x[0])}
          </div>

          <div class="timeline-dot"></div>

          <div class="timeline-content">
            <b>${esc(x[1])}</b>

            <p>
              ${esc(x[2])}
            </p>

            <span class="request-status">
              ${esc(x[3])}
            </span>
          </div>
        </div>
      `).join('');
  }

  document.querySelectorAll('[data-record-tab]').forEach(b=>b.addEventListener('click',()=>{state.recordTab=b.dataset.recordTab;document.querySelectorAll('[data-record-tab]').forEach(x=>x.classList.toggle('active',x===b));renderRecords()}));

  $('requestAccess').addEventListener('click',()=>alert('Để theo dõi bệnh án thật, MEDINEX TECH cần xác minh danh tính, thiết lập sự đồng ý/ủy quyền phù hợp và kết nối với cơ sở y tế. Chức năng này hiện chỉ minh họa.'));
  /* ===== CHỈNH SỬA HỒ SƠ BỆNH ÁN ===== */

  function getRecordProfile() {
    if (!state.user) return {};

    const records =
      getUserRecords();

    return (
      records.profile || {
        name: state.user.name,
        birthYear: '1958',
        condition: 'Tăng huyết áp (mẫu)',
        facility: 'Chưa kết nối'
      }
    );
  }   

  function openRecordProfileModal() {
    if (!state.user) return;

    const profile =
      getRecordProfile();

    $('recordProfileName').value =
      profile.name || state.user.name || '';

    $('recordProfileBirth').value =
      profile.birthYear || '';

    $('recordProfileDisease').value =
      profile.condition || '';

    $('recordProfileFacility').value =
      profile.facility || '';

    $('recordProfileModal').setAttribute(
      'aria-hidden',
      'false'
    );
  }


  function closeRecordProfileModal() {
    $('recordProfileModal').setAttribute(
      'aria-hidden',
      'true'
    );
  }
  /* ===== HIỂN THỊ HỒ SƠ BỆNH ÁN ĐÃ LƯU ===== */

  function renderRecordProfile() {
    if (!state.user) return;

    const profile =
      getRecordProfile();

    $('recordPatientName').textContent =
      profile.name || state.user.name;

    const recordsPage =
    document.querySelector(
      '[data-page-content="records"]'
    );

  const facts =
    recordsPage
      ? recordsPage.querySelectorAll(
          '.patient-facts span'
        )
      : [];

    if (facts[0]) {
      facts[0].innerHTML =
        '♙ <b>Ngày sinh:</b> ' +
        esc(
          profile.birthYear ||
          'Chưa cập nhật'
        );
    }

    if (facts[1]) {
    facts[1].innerHTML =
      '♡ <b>Bệnh lý:</b> ' +
      esc(
        profile.condition ||
        'Chưa cập nhật'
      );
  }

    if (facts[2]) {
      facts[2].innerHTML =
        '⌂ <b>Cơ sở:</b> ' +
        esc(
          profile.facility ||
          'Chưa kết nối'
        );
    }
  }

  $('editRecordProfile').addEventListener(
    'click',
    openRecordProfileModal
  );


  document.querySelectorAll(
    '[data-record-profile-close]'
  ).forEach(button => {
    button.addEventListener(
      'click',
      closeRecordProfileModal
    );
  });


  $('recordProfileForm').addEventListener(
    'submit',
    e => {
      e.preventDefault();

      if (!state.user) return;

      const name =
        $('recordProfileName').value.trim();

      const birthYear =
        $('recordProfileBirth').value.trim();

      const disease =
        $('recordProfileDisease').value.trim();

      const facility =
        $('recordProfileFacility').value.trim();

      if (!name) {
        toast(
          'Vui lòng nhập họ và tên.'
        );
        return;
      }

    const allRecords =
    getStore(STORE.records, {});

  const userRecords =
    getUserRecords();

  userRecords.profile = {
    name,
    birthYear,
    condition: disease,
    facility,
    updatedAt:
      new Date().toISOString()
  };

  allRecords[state.user.email] =
    userRecords;

  if (
    !setStore(
      STORE.records,
      allRecords
    )
  ) {
    return;
  }

      $('recordPatientName').textContent =
        name;

    const recordsPage =
    document.querySelector(
      '[data-page-content="records"]'
    );

  const facts =
    recordsPage
      ? recordsPage.querySelectorAll(
          '.patient-facts span'
        )
      : [];

      if (facts[0]) {
        facts[0].innerHTML =
          '♙ <b>Ngày sinh:</b> ' +
          esc(birthYear || 'Chưa cập nhật');
      }

      if (facts[1]) {
        facts[1].innerHTML =
          '♡ <b>Bệnh lý:</b> ' +
          esc(disease || 'Chưa cập nhật');
      }

      if (facts[2]) {
        facts[2].innerHTML =
          '⌂ <b>Cơ sở:</b> ' +
          esc(facility || 'Chưa kết nối');
      }

      closeRecordProfileModal();

      toast(
        'Đã cập nhật hồ sơ bệnh án demo.'
      );
    }
  );
  $('sosDemo').addEventListener('click',()=>{if(confirm('Đây chỉ là nút mô phỏng, chưa gửi yêu cầu cấp cứu. Bạn có muốn mở trình gọi số 115 không?'))window.location.href='tel:115'});$('call115').addEventListener('click',()=>{if(confirm('Mở ứng dụng gọi điện với số 115? Nếu không có tình huống cấp cứu, hãy hủy thao tác.'))window.location.href='tel:115'});
  $('getLocation').addEventListener('click',()=>{if(!navigator.geolocation){toast('Trình duyệt này không hỗ trợ lấy vị trí.');return}$('locationText').textContent='Đang yêu cầu quyền vị trí…';navigator.geolocation.getCurrentPosition(pos=>{$('locationText').textContent=`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (chỉ trên thiết bị)`;toast('Đã đọc vị trí trên thiết bị; chưa gửi cho bất kỳ đơn vị nào.')},err=>{$('locationText').textContent='Không lấy được vị trí';toast(err.code===1?'Bạn chưa cấp quyền vị trí.':'Không thể xác định vị trí lúc này.')},{enableHighAccuracy:true,timeout:10000,maximumAge:30000})});
  $('setEmergencyContact').addEventListener(
    'click',
    () => {
      if (!state.user) {
        return;
      }

      const allContacts =
        getStore(STORE.contact, {});

      const existing =
        allContacts[state.user.email] || {};

      const name = prompt(
        'Tên người thân liên hệ khẩn cấp:',
        existing.name || ''
      );

      if (name === null) {
        return;
      }

      const phone = prompt(
        'Số điện thoại người thân:',
        existing.phone || ''
      );

      if (phone === null) {
        return;
      }

      const cleanName =
        name.trim();

      const cleanPhone =
        phone.trim();

      if (!cleanName || !cleanPhone) {
        toast(
          'Vui lòng nhập tên và số điện thoại.'
        );

        return;
      }

      allContacts[state.user.email] = {
        name: cleanName,
        phone: cleanPhone,
        updatedAt:
          new Date().toISOString()
      };

      const saved =
        setStore(
          STORE.contact,
          allContacts
        );

      if (!saved) {
        toast(
          'Không thể lưu liên hệ khẩn cấp.'
        );

        return;
      }

      const row =
        $('setEmergencyContact')
          ?.closest('.emergency-row');

      if (row) {
        const contactText =
          row.querySelector('small');

        if (contactText) {
          contactText.textContent =
            cleanName +
            ' · ' +
            cleanPhone;
        }
      }

      toast(
        'Đã lưu liên hệ khẩn cấp cho tài khoản này.'
      );
    }
  );
  $('profileForm').addEventListener(
    'submit',
    async e => {
      console.log(
        'MEDINEX PROFILE SUBMIT RUNNING',
        state.user
      );
      e.preventDefault();

      const name =
        $('profileNameInput').value.trim();

      if (!name) {
        toast('Vui lòng nhập họ tên.');
        return;
      }

      const profile =
        getStore(STORE.profile, {});

      profile[state.user.email] = {
        ...(profile[state.user.email] || {}),
        name,
        email: state.user.email,
        role: state.user.role,
        updatedAt: new Date().toISOString()
      };


      if (!setStore(STORE.profile, profile)) {
        return;
      }

      state.user.name = name;

      setStore(
        STORE.session,
        state.user
      );

      const users =
        getStore(STORE.users, []);

      const index =
        users.findIndex(
          u =>
            u.email === state.user.email &&
            u.role === state.user.role
        );

      if (index >= 0) {
        users[index].name = name;

        setStore(
          STORE.users,
          users
        );
      }

      $('topUserName').textContent = name;
      $('dropdownUserName').textContent = name;
      $('greeting').textContent =
        'Xin chào, ' +
        name.split(' ')[0] +
        ' 👋';

      $('profileAvatar').textContent =
        name.charAt(0).toUpperCase();

      $('profileName').textContent = name;
      $('profileNameInput').value = name;
      const emergencyContacts =
    getStore(STORE.contact, {});

  const emergencyContact =
    emergencyContacts[state.user.email];

  const emergencyRow =
    $('setEmergencyContact')
      ?.closest('.emergency-row');

  if (emergencyRow) {
    const contactText =
      emergencyRow.querySelector('small');

    if (emergencyContact) {
      contactText.textContent =
        emergencyContact.name +
        ' · ' +
        emergencyContact.phone;
    } else {
      contactText.textContent =
        'Chưa thiết lập số liên hệ';
    }
  }

      toast(
    'Đã cập nhật hồ sơ thành công.'
  );
    }
  );
  // MEDINEX AI symptom-support demo: keyword-based guidance only, not a diagnostic model.
  $('aiSymptomForm').addEventListener('submit',e=>{
  e.preventDefault();
  const text=$('aiSymptoms').value.trim().toLocaleLowerCase('vi');
  const age=Number($('aiAge').value||0);
  const out=$('aiResult');
  if(!text){toast('Vui lòng mô tả triệu chứng.');return}
  const danger=['đau ngực','khó thở','không thở được','ngất','bất tỉnh','co giật','liệt','méo miệng','nói khó','yếu liệt','chảy máu nhiều','nôn ra máu','đi cầu phân đen'];
  const urgent=danger.some(k=>text.includes(k));
  let title,body,advice,kind;
  if(urgent){
  kind='urgent';title='Có dấu hiệu cần được đánh giá khẩn cấp';
  body='Mô tả của bạn có chứa từ khóa liên quan đến dấu hiệu nguy hiểm. Không chờ kết quả từ công cụ này.';
  advice='Nếu người bệnh đang có triệu chứng này, hãy gọi 115 hoặc đến cơ sở cấp cứu ngay. Không tự lái xe nếu đang choáng, ngất hoặc khó thở.';
  }else if(age>=65||text.includes('sốt')||text.includes('đau')||text.includes('ho')||text.includes('chóng mặt')){
  kind='caution';title='Nên được nhân viên y tế đánh giá';
  body='Triệu chứng có thể có nhiều nguyên nhân. Chỉ từ mô tả ngắn, hệ thống không thể xác định bệnh hoặc mức độ nặng.';
  advice='Theo dõi diễn tiến, ghi lại thời điểm khởi phát, nhiệt độ và triệu chứng đi kèm; liên hệ cơ sở y tế nếu kéo dài, nặng lên hoặc khiến bạn lo lắng.';
  }else{
  kind='info';title='Cần thêm thông tin để định hướng';
  body='Mô tả hiện tại chưa đủ để đưa ra nhận định đáng tin cậy. Một triệu chứng đơn lẻ có thể gặp trong nhiều tình trạng khác nhau.';
  advice='Bổ sung vị trí, mức độ, thời gian xuất hiện, yếu tố làm tăng/giảm và bệnh nền/thuốc đang dùng; cân nhắc hỏi nhân viên y tế.';
  }
  out.hidden=false;out.className='ai-result '+kind;
  out.innerHTML=`<b>${esc(title)}</b><p>${esc(body)}</p><p><strong>Gợi ý:</strong> ${esc(advice)}</p><small>Đây là phản hồi demo dựa trên từ khóa, không phải AI lâm sàng, không chẩn đoán và không thay thế bác sĩ.</small>`;
  });
  $('globalSearch').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=e.target.value.trim().toLocaleLowerCase('vi');if(!q){toast('Nhập từ khóa để tìm trong các chức năng.');return}const pages=[['homecare','y tế tại nhà đặt dịch vụ chăm sóc khám'],['students','thuê sinh viên hỗ trợ tại viện'],['records','bệnh án số hồ sơ sức khỏe người thân thuốc xét nghiệm'],['sos','sos cấp cứu khẩn cấp'],['requests','lịch sử yêu cầu lịch hẹn'],['profile','hồ sơ cá nhân tài khoản']];const found=pages.find(p=>(p[1]+' '+p[0]).includes(q));if(found){goPage(found[0]);toast('Đã mở mục phù hợp với tìm kiếm.')}else toast('Chưa tìm thấy mục phù hợp. Thử “dịch vụ”, “sinh viên”, “bệnh án” hoặc “SOS”.')});
  async function loadSupabaseUser(session) {
    if (!session || !session.user) {
      return null;
    }

    const {
      data: profile,
      error
    } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) {
      console.error(
        'MEDINEX Profile Load Error:',
        error
      );

      return null;
    }

    return {
      id: session.user.id,
      email:
        profile.email ||
        session.user.email ||
        '',
      name:
        profile.name ||
        session.user.email?.split('@')[0] ||
        'Người dùng',
      role:
        profile.role ||
        'patient'
    };
  }


  function restoreAppRoute() {
    const route =
      location.hash.match(
        /^#app\/(overview|services|notifications|homecare|students|records|sos|requests|profile|doctor-consult|doctor-chat)$/
      );

    if (route) {
      goPage(
        route[1],
        false
      );
    }
  }


  async function restoreSupabaseSession() {
    try {
      const {
        data,
        error
      } = await supabaseClient.auth.getSession();

      if (error) {
        console.error(
          'MEDINEX Session Error:',
          error
        );
        return;
      }

      if (!data.session) {
        return;
      }

      const user =
        await loadSupabaseUser(
          data.session
        );

      if (!user) {
        return;
      }

  state.user = user;

  showApp({
    restoreRoute: true
  });

    } catch (error) {
      console.error(
        'MEDINEX Restore Error:',
        error
      );
    }
  }


  supabaseClient.auth.onAuthStateChange(
    (event, session) => {

      if (
        event === 'SIGNED_IN' &&
        session
      ) {
        setTimeout(async () => {

          const user =
            await loadSupabaseUser(
              session
            );

          if (!user) {
            return;
          }

          state.user = user;

        if (
    $('app').classList.contains(
      'hidden'
    )
  ) {
    showApp({
      restoreRoute: true
    });
  }

        }, 0);
      }


      if (
        event === 'SIGNED_OUT'
      ) {
        state.user = null;
  state.requests = null;
  state.records = null;

  localStorage.removeItem(
    STORE.session
  );

        $('app').classList.add(
          'hidden'
        );

        $('home').classList.remove(
          'hidden'
        );

        $('sidebar').classList.remove(
          'mobile-open'
        );
      }

    }
  );


  restoreSupabaseSession();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then(() => {
          console.log(
            'MEDINEX PWA: Service Worker registered.'
          );
        })
        .catch(error => {
          console.error(
            'MEDINEX PWA: Service Worker registration failed:',
            error
          );
        });
    });
  }

  let deferredInstallPrompt = null;

  window.addEventListener(
    'beforeinstallprompt',
    event => {
      event.preventDefault();

      deferredInstallPrompt = event;

      const installButton =
        document.getElementById(
          'installAppBtn'
        );

      if (!installButton) {
        return;
      }

      installButton.hidden = false;
    }
  );

  window.addEventListener(
    'appinstalled',
    () => {
      deferredInstallPrompt = null;

      const installButton =
        document.getElementById(
          'installAppBtn'
        );

      if (installButton) {
        installButton.hidden = true;
      }

      console.log(
        'MEDINEX PWA: App installed.'
      );
    }
  );

  const installAppButton =
    document.getElementById(
      'installAppBtn'
    );
const isStandalone =
  window.matchMedia(
    '(display-mode: standalone)'
  ).matches ||
  window.navigator.standalone === true;

if (isStandalone) {
  installAppButton.hidden = true;
}
  if (installAppButton) {
    installAppButton.addEventListener(
      'click',
      async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();

          const choice =
            await deferredInstallPrompt.userChoice;

          console.log(
            'MEDINEX PWA install choice:',
            choice.outcome
          );

          deferredInstallPrompt = null;
          installAppButton.hidden = true;

          return;
        }

        const isIOS =
          /iphone|ipad|ipod/i.test(
            navigator.userAgent
          );

        const isStandalone =
          window.matchMedia(
            '(display-mode: standalone)'
          ).matches ||
          window.navigator.standalone === true;
        if (isStandalone) {
          toast(
            'MEDINEX TECH đã được cài trên thiết bị.'
          );
          return;
        }

        if (isIOS) {
          toast(
            'Trên iPhone/iPad: nhấn Chia sẻ → Thêm vào Màn hình chính.'
          );
          return;
        }

        toast(
          'Hãy mở MEDINEX TECH bằng Chrome rồi thử lại.'
        );
      }
    );
  }

  })();
  /* =========================================================
   DOCTOR CONSULTATION - SEARCH & FILTER
   ========================================================= */

const doctorSearch = document.getElementById('doctorSearch');
const doctorSpecialtyFilter =
  document.getElementById('doctorSpecialtyFilter');

if (doctorSearch && doctorSpecialtyFilter) {

  const doctorCards =
    document.querySelectorAll('.doctor-consult-card');

  function filterDoctors() {

    const keyword = doctorSearch.value
      .toLocaleLowerCase('vi')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();

    const specialty =
      doctorSpecialtyFilter.value;

    doctorCards.forEach(card => {

      const doctorName =
        (card.dataset.doctor || '')
          .toLocaleLowerCase('vi')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd');

      const cardSpecialty =
        card.dataset.specialty || '';

      const matchesKeyword =
        !keyword ||
        doctorName.includes(keyword) ||
        card.textContent
          .toLocaleLowerCase('vi')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .includes(keyword);

      const matchesSpecialty =
        specialty === 'all' ||
        cardSpecialty === specialty;

      card.style.display =
        matchesKeyword && matchesSpecialty
          ? ''
          : 'none';
    });
  }

  doctorSearch.addEventListener(
    'input',
    filterDoctors
  );

  doctorSpecialtyFilter.addEventListener(
    'change',
    filterDoctors
  );
}
/* =========================================================
   DOCTOR CONSULTATION - CONTACT PANEL
   ========================================================= */

let selectedDoctor = {
  name: 'BS. Nguyễn Văn A',
  specialty: 'Nội khoa',
  rating: '★ 4.9 · 1.2k lượt tư vấn',
  avatar: 'BS'
};

const doctorContactPanel =
  document.getElementById('doctorContactPanel');

const doctorContactClose =
  document.getElementById('doctorContactClose');

const doctorContactName =
  document.getElementById('doctorContactName');

const doctorContactSpecialty =
  document.getElementById('doctorContactSpecialty');

const doctorContactRating =
  document.getElementById('doctorContactRating');

const doctorContactAvatar =
  document.getElementById('doctorContactAvatar');


if (doctorContactPanel) {

  document
    .querySelectorAll('.doctor-consult-contact')
    .forEach(button => {

      button.addEventListener('click', () => {

        const card =
          button.closest('.doctor-consult-card');

        if (!card) return;

        const name =
          card.dataset.doctor ||
          'Bác sĩ';

        const specialty =
          card.querySelector(
            '.doctor-consult-info > small'
          )?.textContent.trim() ||
          'Chuyên khoa';

        const rating =
          card.querySelector(
            '.doctor-consult-meta'
          )?.textContent.trim() ||
          '★ 4.9';

        const avatarImg =
  card.querySelector(
    '.doctor-consult-avatar img'
  );

const avatar =
  avatarImg?.getAttribute('src') ||
  'BS';


        doctorContactName.textContent =
          `BS. ${name.replace(/^BS\.\s*/i, '')}`;

        doctorContactSpecialty.textContent =
          specialty;

        doctorContactRating.textContent =
          rating;

        if (avatar !== 'BS') {
  doctorContactAvatar.innerHTML = `
    <img
      src="${avatar}"
      alt="${doctorContactName.textContent}"
    >
  `;
} else {
  doctorContactAvatar.textContent = 'BS';
}


        selectedDoctor = {
          name: `BS. ${name.replace(/^BS\.\s*/i, '')}`,
          specialty,
          rating,
          avatar
        };


        doctorContactPanel.hidden = false;

        doctorContactPanel.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      });
    });


  if (doctorContactClose) {
    doctorContactClose.addEventListener(
      'click',
      () => {
        doctorContactPanel.hidden = true;
      }
    );
  }
}


/* =========================================================
   DOCTOR CHAT
   ========================================================= */

const doctorContactChat =
  document.getElementById('doctorContactChat');

const doctorChatBack =
  document.getElementById('doctorChatBack');


if (doctorContactChat) {

  doctorContactChat.addEventListener('click', () => {

    const doctorChatName =
      document.getElementById('doctorChatName');

    const doctorChatSpecialty =
      document.getElementById('doctorChatSpecialty');

    const doctorChatAvatar =
      document.getElementById('doctorChatAvatar');


    if (doctorChatName) {
      doctorChatName.textContent =
        selectedDoctor.name;
    }

    if (doctorChatSpecialty) {
      doctorChatSpecialty.textContent =
        `${selectedDoctor.specialty} · ● Đang trực`;
    }

    if (doctorChatAvatar) {
  if (selectedDoctor.avatar !== 'BS') {
    doctorChatAvatar.innerHTML = `
      <img
        src="${selectedDoctor.avatar}"
        alt="${selectedDoctor.name}"
      >
    `;
  } else {
    doctorChatAvatar.textContent = 'BS';
  }
}


    if (doctorContactPanel) {
      doctorContactPanel.hidden = true;
    }


    window.location.hash = '#app/doctor-chat';
  });
}


if (doctorChatBack) {

  doctorChatBack.addEventListener('click', () => {
    window.location.hash = '#app/doctor-consult';
  });

}
const doctorChatCall =
  document.getElementById('doctorChatCall');

const doctorChatVideo =
  document.getElementById('doctorChatVideo');

const doctorCallOverlay =
  document.getElementById('doctorCallOverlay');

const doctorCallType =
  document.getElementById('doctorCallType');

const doctorCallName =
  document.getElementById('doctorCallName');

const doctorCallAvatar =
  document.getElementById('doctorCallAvatar');

const doctorCallStatus =
  document.getElementById('doctorCallStatus');

const doctorCallEnd =
  document.getElementById('doctorCallEnd');

const doctorCallMute =
  document.getElementById('doctorCallMute');

const doctorCallCamera =
  document.getElementById('doctorCallCamera');
const doctorContactCall =
  document.getElementById('doctorContactCall');


function openDoctorCall(type) {
  if (!doctorCallOverlay) return;

  doctorCallType.textContent =
    type === 'video'
      ? 'GỌI VIDEO'
      : 'GỌI THOẠI';

  doctorCallName.textContent =
    selectedDoctor.name;

  if (selectedDoctor.avatar !== 'BS') {
  doctorCallAvatar.innerHTML = `
    <img
      src="${selectedDoctor.avatar}"
      alt="${selectedDoctor.name}"
    >
  `;
} else {
  doctorCallAvatar.textContent = 'BS';
}

  doctorCallStatus.textContent =
    'Đang kết nối...';

  doctorCallOverlay.hidden = false;

  setTimeout(() => {
    if (!doctorCallOverlay.hidden) {
      doctorCallStatus.textContent =
        'Đang kết nối với bác sĩ...';
    }
  }, 1000);
}
document.addEventListener('click', (event) => {

  const button =
    event.target.closest(
      '#doctorContactCall, #doctorChatCall, #doctorChatVideo'
    );

  if (!button) return;

  if (button.id === 'doctorContactCall') {
    openDoctorCall('voice');
    return;
  }

  if (button.id === 'doctorChatCall') {
    openDoctorCall('voice');
    return;
  }

  if (button.id === 'doctorChatVideo') {
    openDoctorCall('video');
    return;
  }

});



if (doctorCallEnd) {
  doctorCallEnd.addEventListener('click', () => {
    doctorCallOverlay.hidden = true;
  });
}


if (doctorCallMute) {
  doctorCallMute.addEventListener('click', () => {
    doctorCallMute.classList.toggle('active');

    doctorCallMute.textContent =
      doctorCallMute.classList.contains('active')
        ? '🔇'
        : '🎙';
  });
}


if (doctorCallCamera) {
  doctorCallCamera.addEventListener('click', () => {
    doctorCallCamera.classList.toggle('active');
  });
}
const doctorChatInput = document.getElementById('doctorChatInput');
const doctorChatSend = document.getElementById('doctorChatSend');
const doctorChatMessages = document.getElementById('doctorChatMessages');
const doctorChatImage =
  document.getElementById('doctorChatImage');

if (doctorChatImage && doctorChatMessages) {
  doctorChatImage.addEventListener('change', event => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn một tệp hình ảnh.');
      event.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    const messageWrap =
      document.createElement('div');

    messageWrap.className =
      'doctor-chat-message doctor-chat-message-patient';

    messageWrap.innerHTML = `
      <div class="doctor-chat-bubble doctor-chat-image-bubble">
        <img
          src="${imageUrl}"
          alt="Ảnh người bệnh gửi"
          class="doctor-chat-image-preview"
        >
        <small>
          ${new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </small>
      </div>
    `;

    doctorChatMessages.appendChild(messageWrap);

    doctorChatMessages.scrollTop =
      doctorChatMessages.scrollHeight;

    event.target.value = '';

    setTimeout(() => {
      addDoctorDemoReply();
    }, 500);
  });
}
function sendDoctorChatMessage() {
  if (!doctorChatInput || !doctorChatMessages) return;

  const message = doctorChatInput.value.trim();
  if (!message) return;

  const now = new Date();

  const time = now.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const messageWrap = document.createElement('div');
  messageWrap.className =
    'doctor-chat-message doctor-chat-message-patient';

  messageWrap.innerHTML = `
    <div class="doctor-chat-bubble">
      <p></p>
      <small>${time}</small>
    </div>
  `;

  messageWrap.querySelector('p').textContent = message;

  doctorChatMessages.appendChild(messageWrap);

  doctorChatInput.value = '';
doctorChatInput.focus();

doctorChatMessages.scrollTop =
  doctorChatMessages.scrollHeight;

addDoctorDemoReply();
}

if (doctorChatSend) {
  doctorChatSend.addEventListener(
    'click',
    sendDoctorChatMessage
  );
}

if (doctorChatInput) {
  doctorChatInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendDoctorChatMessage();
    }
  });
}
function addDoctorDemoReply() {
  if (!doctorChatMessages) return;

  const typing = document.createElement('div');
  typing.className = 'doctor-chat-typing';

  typing.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
    <small>Bác sĩ đang nhập...</small>
  `;

  doctorChatMessages.appendChild(typing);

  doctorChatMessages.scrollTop =
    doctorChatMessages.scrollHeight;

  setTimeout(() => {
    typing.remove();

    const reply = document.createElement('div');

    reply.className =
      'doctor-chat-message doctor-chat-message-doctor';

    reply.innerHTML = `
  <div class="doctor-chat-bubble">
    <b class="doctor-chat-reply-name"></b>

    <p>
      Mình đã nhận được thông tin của bạn.
      Bạn mô tả thêm giúp tôi triệu chứng xuất hiện
      từ khi nào và có kèm khó thở, chóng mặt
      hoặc sốt không nhé.
    </p>

    <small>
      ${new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      })}
    </small>
  </div>
`;

reply.querySelector('.doctor-chat-reply-name').textContent =
  selectedDoctor.name;

    doctorChatMessages.appendChild(reply);

    doctorChatMessages.scrollTop =
      doctorChatMessages.scrollHeight;

  }, 1200);
}
const doctorChatQuickReplies =
  document.getElementById('doctorChatQuickReplies');

if (doctorChatQuickReplies && doctorChatInput) {
  doctorChatQuickReplies
    .querySelectorAll('button')
    .forEach(button => {
      button.addEventListener('click', () => {
        doctorChatInput.value = button.textContent.trim();
        doctorChatInput.focus();
      });
    });
}