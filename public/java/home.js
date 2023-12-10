// const buttonHomeNews = document.getElementById("button-home-news");
// const buttonHomeNewsauc = document.getElementById("button-home-newsauc");

// buttonHomeNews.addEventListener("click", () => {
//   // ให้ buttonHomeNews มี style
//   buttonHomeNews.style.boxShadow = "0 5px 10px 0 rgba(0, 0, 0, 0.5)";
//   buttonHomeNews.style.borderLeft = "3px solid #00672F";
  
//   // ให้ buttonHomeNewsauc ไม่มี style
//   buttonHomeNewsauc.style.boxShadow = "none";
//   buttonHomeNewsauc.style.borderLeft = "1px solid #e0dddd";
//   buttonHomeNewsauc.style.borderTop = "none";
// });

// buttonHomeNewsauc.addEventListener("click", () => {
//   // ให้ buttonHomeNewsauc มี style
//   buttonHomeNewsauc.style.boxShadow = "0 5px 10px 0 rgba(0, 0, 0, 0.5)";
//   buttonHomeNewsauc.style.borderLeft = "3px solid #00672F";
//   buttonHomeNewsauc.style.borderTop = "none";

//   // ให้ buttonHomeNews ไม่มี style
//   buttonHomeNews.style.boxShadow = "none";
//   buttonHomeNews.style.borderLeft = "1px solid #e0dddd";
// });












// สร้างวันที่และเดือนในรูปแบบของ พ.ศ.
var buddhistYear = 2566;
var month = 6;
var day = 22;

// แปลงเป็นวันที่ในรูปแบบที่ต้องการ
var formattedDate = day + ' ' + getMonthName(month) + ' ' + 'พ.ศ. ' + buddhistYear;

// หาชื่อเดือนจากเลขเดือน
function getMonthName(month) {
  var monthNames = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม'
  ];
  return monthNames[month - 1];
}

// แทรกวันที่ลงในแต่ละ <td>
var table = document.getElementById('datehome');
var cells = table.getElementsByTagName('td');

for (var i = 0; i < cells.length; i++) {
  cells[i].innerHTML = formattedDate;
}