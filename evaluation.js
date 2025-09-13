// ==========================================================
// == ✨ กรุณาแก้ไขค่า 2 บรรทัดนี้ ✨ ==
// ==========================================================
const LIFF_ID = "2008092354-pgKAqJ8O"; // LIFF ID ของหน้าประเมินที่คุณสร้างใหม่
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwFzsPVx7P8srOQZzTC57PqUY9ePm_L5pdBVAXKEsHOJt5LEFLy1REYxIG-O89i-hY3/exec"; // URL ของ Web App ที่ได้จากการ Deploy
// ==========================================================

// =====================================================================
// 🌟 ฟังก์ชันนี้ใช้สำหรับตรวจสอบว่าเคยประเมินไปแล้วหรือไม่ (frontend)
// =====================================================================

/**
 * เรียกใช้เมื่อโหลดหน้าเว็บ เพื่อเช็คว่า ticketId เคยถูกประเมินหรือยัง
 * ถ้าเคยประเมินแล้ว จะซ่อนฟอร์มและแสดงข้อความขอบคุณแทน
 */
document.addEventListener("DOMContentLoaded", async () => {
    const loadingDiv = document.getElementById('loading');
    const formDiv = document.getElementById('evaluationForm');
    const thankYouDiv = document.getElementById('thankYouMessage');

    try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isInClient()) {
            loadingDiv.innerHTML = '<p class="text-red-500 font-bold text-center">กรุณาเปิดหน้านี้ผ่านแอปพลิเคชัน LINE</p>';
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const ticketId = urlParams.get('ticketId');
        if (!ticketId) throw new Error("ไม่พบรหัสใบแจ้งซ่อม");

        // เรียก API จาก Google Apps Script เพื่อตรวจสอบการประเมิน
        const response = await fetch(`${SCRIPT_URL}?action=getEvaluationData&ticketId=${ticketId}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        if (data.alreadyEvaluated) {
            // แสดงข้อความขอบคุณ หากเคยประเมินแล้ว
            loadingDiv.classList.add('hidden');
            thankYouDiv.classList.remove('hidden');
        } else {
            populateForm(data.repairData);
            loadingDiv.classList.add('hidden');
            formDiv.classList.remove('hidden');
        }

    } catch (error) {
        console.error("Error:", error);
        loadingDiv.innerHTML = `<p class="text-red-500 font-bold text-center">เกิดข้อผิดพลาด: ${error.message}</p>`;
    }
});


function populateForm(data) {
    if (!data) throw new Error("ไม่พบข้อมูลงานซ่อม");
    document.getElementById('info-ticketId').textContent = data['รหัสใบแจ้งซ่อม'] || 'N/A';
    document.getElementById('info-equipmentName').textContent = data['ชื่อครุภัณฑ์'] || 'N/A';
    document.getElementById('info-operator').textContent = data['ผู้ปฏิบัติงาน'] || 'N/A';
}

document.getElementById('evaluationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    
    const overallScore = this.elements['overall'].value;
    if (!overallScore) {
        Swal.fire('กรุณาให้คะแนน', 'โปรดให้คะแนนความพึงพอใจโดยรวมก่อนส่งแบบประเมิน', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>กำลังส่ง...';

    const evaluationData = {
        ticketId: new URLSearchParams(window.location.search).get('ticketId'),
        overallScore: parseInt(overallScore),
        comments: this.elements['comments'].value.trim()
    };

    try {
        const response = await fetch(`${SCRIPT_URL}?action=submitEvaluation`, {
            method: 'POST',
            // ✨ แก้ไข: ใช้ JSON.stringify สำหรับ body และกำหนด content-type เป็น text/plain
            // ตามที่ Apps Script ต้องการเมื่อรับค่าจาก e.postData.contents
            body: JSON.stringify(evaluationData),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Unknown error');
        
        // --- ✨ ส่วนนี้คือโค้ดที่แก้ไขแล้วและทำงานได้ถูกต้อง ✨ ---
        
        // ซ่อนฟอร์มทิ้งไปเลย
        document.getElementById('evaluationForm').classList.add('hidden');

        // แสดงข้อความขอบคุณด้วย SweetAlert พร้อมตั้งเวลาปิด
        Swal.fire({
            icon: 'success',
            title: 'ขอบคุณสำหรับความคิดเห็น!',
            text: 'เราได้บันทึกข้อมูลของท่านเรียบร้อยแล้ว',
            timer: 2500, // แสดงผล 2.5 วินาที
            showConfirmButton: false, // ไม่ต้องมีปุ่ม OK
            timerProgressBar: true,   // มีแถบเวลาวิ่งให้ดู
        }).then(() => {
            // หลังจากที่ SweetAlert ปิดตัวลง (ครบ 2.5 วิ) ให้สั่งปิดหน้าต่าง LIFF
            if (liff.isInClient()) {
                liff.closeWindow();
            }
        });
        // --- สิ้นสุดส่วนที่แก้ไข ---

    } catch (error) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'ส่งแบบประเมิน';
    }
});
