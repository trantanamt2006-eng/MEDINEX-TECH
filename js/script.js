(function(){
'use strict';
const $=(id)=>document.getElementById(id);
const state={mode:'login',role:'patient',user:null,service:'Chăm sóc người bệnh tại nhà',recordTab:'timeline',students:[]};
const roleNames={patient:'Người bệnh / Người nhà',staff:'Cán bộ y tế',student:'Sinh viên hỗ trợ tại viện'};
const STORE={users:'mnv2_users',session:'mnv2_session',requests:'mnv2_requests',contact:'mnv2_emergency_contact',profile:'mnv2_profile',records:'mnv2_records'};
function safeParse(value,fallback){try{return JSON.parse(value)||fallback}catch(e){return fallback}}
function getStore(key,fallback){return safeParse(localStorage.getItem(key),fallback)}
function setStore(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){toast('Không thể lưu dữ liệu trên trình duyệt này.');return false}}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200)}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateLabel(date){if(!date)return 'Chưa chọn ngày';const d=new Date(date+'T12:00:00');return Number.isNaN(d.getTime())?date:d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}
function openAuth(mode){state.mode=mode||'login';$('authLayer').classList.remove('hidden');$('roleChoices').classList.remove('hidden');$('authForm').classList.add('hidden');$('authTitle').textContent=state.mode==='register'?'Tạo tài khoản MEDINEX':'Chào mừng bạn trở lại';$('authDescription').textContent='Chọn vai trò để tiếp tục.'}
function closeAuth(){$('authLayer').classList.add('hidden')}
document.querySelectorAll('[data-open-auth]').forEach(b=>b.addEventListener('click',()=>openAuth(b.dataset.openAuth)));
document.querySelectorAll('[data-close-auth]').forEach(b=>b.addEventListener('click',closeAuth));
document.querySelectorAll('[data-role]').forEach(b=>b.addEventListener('click',()=>{state.role=b.dataset.role;$('roleChoices').classList.add('hidden');$('authForm').classList.remove('hidden');$('authTitle').textContent=state.mode==='register'?'Tạo tài khoản demo':'Đăng nhập demo';$('authDescription').textContent='Vai trò: '+roleNames[state.role];$('nameLabel').classList.toggle('hidden',state.mode!=='register');$('authName').classList.toggle('hidden',state.mode!=='register');$('authName').required=state.mode==='register';$('authPassword').autocomplete=state.mode==='register'?'new-password':'current-password';$('authSubmit').textContent=state.mode==='register'?'Tạo tài khoản demo →':'Đăng nhập →';$('authSwitchText').textContent=state.mode==='register'?'Đã có tài khoản?':'Chưa có tài khoản?';$('authSwitch').textContent=state.mode==='register'?'Đăng nhập':'Đăng ký';$('authName').value='';$('authEmail').value='';$('authPassword').value=''}));
$('backRoles').addEventListener('click',()=>{$('roleChoices').classList.remove('hidden');$('authForm').classList.add('hidden')});
$('authSwitch').addEventListener('click',()=>{state.mode=state.mode==='register'?'login':'register';$('authTitle').textContent=state.mode==='register'?'Tạo tài khoản demo':'Đăng nhập demo';$('nameLabel').classList.toggle('hidden',state.mode!=='register');$('authName').classList.toggle('hidden',state.mode!=='register');$('authName').required=state.mode==='register';$('authPassword').autocomplete=state.mode==='register'?'new-password':'current-password';$('authSubmit').textContent=state.mode==='register'?'Tạo tài khoản demo →':'Đăng nhập →';$('authSwitchText').textContent=state.mode==='register'?'Đã có tài khoản?':'Chưa có tài khoản?';$('authSwitch').textContent=state.mode==='register'?'Đăng nhập':'Đăng ký'});
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
function showApp(){if(!state.user)return;$('landing').classList.add('hidden');$('app').classList.remove('hidden');$('topUserName').textContent=state.user.name;$('topUserRole').textContent=roleNames[state.user.role];$('userAvatar').textContent=(state.user.name||'M').trim().charAt(0).toUpperCase();$('dropdownAvatar').textContent=(state.user.name||'M').trim().charAt(0).toUpperCase();$('dropdownUserName').textContent=state.user.name;$('dropdownUserEmail').textContent=state.user.email;$('greeting').textContent='Xin chào, '+state.user.name.split(' ')[0]+' 👋';$('todayLabel').textContent=new Date().toLocaleDateString('vi-VN',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'});$('profileAvatar').textContent=(state.user.name||'M').charAt(0).toUpperCase();$('profileName').textContent=state.user.name;$('profileRole').textContent=roleNames[state.user.role];
$('profileNameInput').value=state.user.name;
$('profileEmailInput').value=state.user.email;
$('profileRoleInput').value=roleNames[state.user.role];

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
$('stDate').min=todayISO();$('stDate').value=todayISO();renderStudents();renderRecords();renderRecordProfile();renderRequests();goPage('overview')}
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

    localStorage.removeItem(
      STORE.session
    );

    $('app').classList.add('hidden');
    $('landing').classList.remove('hidden');
    $('sidebar').classList.remove(
      'mobile-open'
    );

    toast(
      'Đã đăng xuất khỏi MEDINEX TECH.'
    );

  } catch (error) {
    console.error(
      'MEDINEX Logout Error:',
      error
    );

    toast(
      'Có lỗi khi đăng xuất.'
    );
  }
}
$('sidebarLogout').addEventListener('click',logout);$('userMenu').addEventListener('click',e=>{e.stopPropagation();const menu=$('accountDropdown');menu.hidden=!menu.hidden;$('userMenu').setAttribute('aria-expanded',String(!menu.hidden))});$('dropdownProfile').addEventListener('click',()=>{closeAccountMenu();goPage('profile')});$('dropdownLogout').addEventListener('click',logout);document.addEventListener('click',e=>{if(!$('accountMenuWrap').contains(e.target))closeAccountMenu()});$('notifications').addEventListener('click',()=>toast('Bạn chưa có thông báo mới trong bản demo.'));
function goPage(page,updateHistory=true){
const allowed=['overview','homecare','students','records','sos','requests','profile'];
if(!allowed.includes(page))page='overview';
document.querySelectorAll('[data-page-content]').forEach(p=>p.classList.toggle('active',p.dataset.pageContent===page));
document.querySelectorAll('.side-link[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
$('sidebar').classList.remove('mobile-open');
if(page==='requests')renderRequests();if(page==='records')renderRecords();
if(updateHistory&&location.hash!=='#app/'+page)history.pushState({page},'', '#app/'+page);
window.scrollTo({top:0,behavior:'smooth'})
}
window.addEventListener('popstate',()=>{
if(!state.user)return;
const match=location.hash.match(/^#app\/(overview|homecare|students|records|sos|requests|profile)$/);
if(match)goPage(match[1],false);
});

document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.page)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>goPage(b.dataset.go)));$('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('mobile-open'));document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();closeAccountMenu();$('sidebar').classList.remove('mobile-open')}});
function getRequests() {
  if (!state.user) {
    return [];
  }

  const allRequests =
    getStore(STORE.requests, []);

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
      request.owner === state.user.email
  );
}
function addRequest(request){const all=getStore(STORE.requests,[]);all.unshift({...request,owner:state.user.email,id:'MN-'+Date.now().toString().slice(-8),createdAt:new Date().toISOString(),status:'Chờ xác nhận (demo)'});return setStore(STORE.requests,all)}
function renderRequests() {
      const isStaff =
    state.user &&
    state.user.role === 'staff';

  const requests =
  getRequests();
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
      () => {
        const requestId =
          button.dataset.confirmRequest;

        const allRequests =
          getStore(
            STORE.requests,
            []
          );

        const request =
          allRequests.find(
            item =>
              String(item.id) ===
              String(requestId)
          );

        if (!request) {
          toast(
            'Không tìm thấy yêu cầu.'
          );
          return;
        }

        if (
          request.status !==
          'Chờ xác nhận (demo)'
        ) {
          toast(
            'Yêu cầu này đã được xử lý.'
          );
          return;
        }

        request.status =
          'Đã xác nhận';

        request.confirmedBy =
          state.user.email;

        request.confirmedRole =
          state.user.role;

        request.confirmedAt =
          new Date().toISOString();

        if (
          !setStore(
            STORE.requests,
            allRequests
          )
        ) {
          return;
        }

        renderRequests();

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

$('confirmHomecareBtn').addEventListener('click', () => {
  if (!pendingHomecareData) return;

  const savedRequest = {
    ...pendingHomecareData
  };

  if (!addRequest(savedRequest)) return;

  const latestRequest = getRequests()[0];

  if (latestRequest) {
    $('homecareStatusTitle').textContent =
      latestRequest.title;

    $('homecareStatusDate').textContent =
      latestRequest.date;

    $('homecareStatusTime').textContent =
      latestRequest.time;

    $('homecareStatusId').textContent =
      'Mã yêu cầu: ' + latestRequest.id;

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
});


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
    () => {
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

      const newRequests =
        requests.filter(
          request => !(
            String(request.id) === String(requestId) &&
            request.owner === state.user.email
          )
        );

      setStore(
        STORE.requests,
        newRequests
      );

      delete modal.dataset.requestId;

      modal.setAttribute(
        'aria-hidden',
        'true'
      );

      renderRequests();

      toast(
        'Đã xóa yêu cầu demo.'
      );
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
    getStore(STORE.requests, []);

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

$('hireRequestConfirm').addEventListener('click', () => {
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

  if (!addRequest({
    kind: 'Thuê sinh viên',
    title: s.name,
    note: task,
    date,
    time: shift,
    hospital,
    studentId: s.id
  })) {
    return;
  }

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

$('clearRequests').addEventListener('click',()=>{if(!confirm('Xóa toàn bộ lịch sử yêu cầu demo của tài khoản này?'))return;setStore(STORE.requests,getStore(STORE.requests,[]).filter(r=>r.owner!==state.user.email));renderRequests();toast('Đã xóa lịch sử demo của tài khoản này.')});
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

  if (
    !userRecords.timeline ||
    !userRecords.meds ||
    !userRecords.tests ||
    !userRecords.notes
  ) {
    userRecords.timeline =
      JSON.parse(
        JSON.stringify(
          defaultRecordContent.timeline
        )
      );

    userRecords.meds =
      JSON.parse(
        JSON.stringify(
          defaultRecordContent.meds
        )
      );

    userRecords.tests =
      JSON.parse(
        JSON.stringify(
          defaultRecordContent.tests
        )
      );

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

  const patientFacts =
    document.querySelectorAll(
      '.patient-facts span'
    );

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

  const facts =
    document.querySelectorAll(
      '.patient-facts span'
    );

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
        profile.disease ||
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

    const facts =
      document.querySelectorAll(
        '.patient-facts span'
      );

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
        if (!state.user) return;

        const allContacts =
        getStore(STORE.contact, {});

        const existing =
        allContacts[state.user.email] || {};

        const name = prompt(
        'Tên người thân liên hệ khẩn cấp:',
        existing.name || ''
        );

        if (name === null) return;

        const phone = prompt(
        'Số điện thoại người thân:',
        existing.phone || ''
        );

        if (phone === null) return;

        if (
        !name.trim() ||
        !phone.trim()
        ) {
        toast(
            'Vui lòng nhập tên và số điện thoại.'
        );
        return;
        }
allContacts[state.user.email] = {
  name: name.trim(),
  phone: phone.trim(),
  updatedAt: new Date().toISOString()
};

if (
  !setStore(
    STORE.contact,
    allContacts
  )
) {
  return;
}

const row =
  $('setEmergencyContact')
    .closest('.emergency-row');

row.querySelector('small').textContent =
  name.trim() +
  ' · ' +
  phone.trim();

toast(
  'Đã lưu liên hệ khẩn cấp cho tài khoản này.'
);
  }
);
$('profileForm').addEventListener(
  'submit',
  e => {
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
const allRecords =
  getStore(STORE.records, {});

const userRecords =
  allRecords[state.user.email];

if (userRecords && userRecords.profile) {
  userRecords.profile.name = name;

  allRecords[state.user.email] =
    userRecords;

  setStore(
    STORE.records,
    allRecords
  );
}
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
      'Đã cập nhật hồ sơ demo.'
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
      /^#app\/(overview|homecare|students|records|sos|requests|profile)$/
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

    showApp();
    restoreAppRoute();

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
          showApp();
          restoreAppRoute();
        }

      }, 0);
    }


    if (
      event === 'SIGNED_OUT'
    ) {
      state.user = null;

      localStorage.removeItem(
        STORE.session
      );

      $('app').classList.add(
        'hidden'
      );

      $('landing').classList.remove(
        'hidden'
      );

      $('sidebar').classList.remove(
        'mobile-open'
      );
    }

  }
);


restoreSupabaseSession();

})();
