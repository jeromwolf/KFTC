/**
 * PDF 생성 테스트 스크립트 - Puppeteer 사용
 * 4개 템플릿의 PDF 출력을 검증합니다.
 */
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TEMPLATES = [
  {
    name: '출장결과보고서',
    file: 'templates/출장결과보고서.html',
    fill: async (page) => {
      await page.type('#name', '홍길동');
      await page.type('#dept', '심판관리관실 / 사무관');
      await page.evaluate(() => { document.getElementById('dateFrom').value = '2026-03-04'; });
      await page.evaluate(() => { document.getElementById('dateTo').value = '2026-03-05'; });
      await page.type('#destination', '서울특별시 강남구');
      await page.type('#purpose', '불공정거래행위 현장 조사 및 관계기관 협의');
      await page.type('#activities', '관계기관 담당자 면담\n현장 실태 조사 및 자료 수집\n유관부서 협의회 참석');
      await page.type('#results', '관계기관과 공동 대응 방안 합의\n자료 수집 완료');
      await page.type('#followup', '후속 조사 일정 수립\n보고서 작성 후 상급자 보고');
    },
    generate: async (page) => {
      // Remove API key to use basic mode (no API call needed)
      await page.evaluate(() => {
        document.getElementById('apiKeyInput').value = '';
        localStorage.removeItem('ftc_api_key');
      });
      await page.click('.btn-generate');
      await page.waitForSelector('#outputSection.visible', { timeout: 5000 });
    }
  },
  {
    name: '민원답변공문',
    file: 'templates/민원답변공문.html',
    fill: async (page) => {
      await page.type('#complaintTitle', 'OO마트의 가격 담합 의혹 신고');
      await page.type('#complaintContent', 'OO마트와 XX마트가 가격을 동시에 인상하여 담합 의혹이 있습니다.');
      await page.select('#complaintType', '가격 담합');
      await page.type('#handlerName', '홍길동');
      await page.select('#processResult', '조사 착수');
    },
    generate: async (page) => {
      await page.evaluate(() => {
        document.getElementById('apiKeyInput').value = '';
        localStorage.removeItem('ftc_api_key');
      });
      await page.click('.btn-generate');
      await page.waitForSelector('.a4-wrapper', { timeout: 5000 });
    }
  },
  {
    name: '회의록자동구조화',
    file: 'templates/회의록자동구조화.html',
    fill: async (page) => {
      await page.type('#meetingName', '2026년 1분기 정책 검토 회의');
      await page.type('#meetingDate', '2026. 03. 21. 14:00');
      await page.type('#meetingPlace', '공정거래위원회 대회의실');
      await page.type('#attendees', '홍길동, 이순신, 김철수');
      await page.type('#meetingContent', '시장 지배적 지위 남용 사례 검토\nA사 과징금 부과 여부 논의\n다음 달 공청회 준비 필요');
    },
    generate: async (page) => {
      await page.evaluate(() => {
        document.getElementById('apiKeyInput').value = '';
        localStorage.removeItem('ftc_api_key');
      });
      await page.click('#structureBtn');
      await page.waitForSelector('#outputSection.visible', { timeout: 5000 });
    }
  },
  {
    name: '공문안내문생성기',
    file: 'templates/공문안내문생성기.html',
    fill: async (page) => {
      await page.select('#doc-type', '업무협조요청');
      await page.type('#recipient', '기획재정부 경제정책과');
      await page.type('#doc-title', '2026년 시장 경쟁 촉진 업무 협조 요청');
      await page.type('#core-content', '독과점 규제 관련 자료 제출 요청 및 시장 점유율 현황 파악이 필요합니다.');
      await page.type('#request-details', '관련 자료를 2026년 4월 30일까지 담당자 이메일로 송부해 주시기 바랍니다.');
      await page.type('#handler', '시장감시국 경쟁정책과 홍길동');
    },
    generate: async (page) => {
      await page.evaluate(() => {
        document.getElementById('api-key-input').value = '';
        localStorage.removeItem('ftc_api_key');
      });
      await page.click('#generate-btn');
      await page.waitForFunction(() => {
        return document.getElementById('output-section').style.display === 'block';
      }, { timeout: 5000 });
    }
  }
];

async function testTemplate(browser, template) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const filePath = 'file://' + path.resolve(__dirname, template.file);
  console.log(`\n=== ${template.name} 테스트 ===`);
  console.log(`  파일: ${template.file}`);

  try {
    await page.goto(filePath, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('  ✓ 페이지 로드 성공');

    // Fill form
    await template.fill(page);
    console.log('  ✓ 폼 입력 완료');

    // Generate document (basic mode - no API key)
    await template.generate(page);
    console.log('  ✓ 문서 생성 완료 (기본 모드)');

    // Check #documentPreview exists and has content
    const previewInfo = await page.evaluate(() => {
      const el = document.getElementById('documentPreview');
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        width: rect.width,
        height: rect.height,
        padding: style.padding,
        textLength: el.innerText.length,
        hasContent: el.innerHTML.trim().length > 0
      };
    });

    if (!previewInfo) {
      console.log('  ✗ #documentPreview 요소를 찾을 수 없음');
      await page.close();
      return { name: template.name, success: false, error: 'No preview element' };
    }

    console.log(`  미리보기 크기: ${Math.round(previewInfo.width)}x${Math.round(previewInfo.height)}px`);
    console.log(`  패딩: ${previewInfo.padding}`);
    console.log(`  텍스트 길이: ${previewInfo.textLength}자`);

    // Now test PDF generation by intercepting the download
    // We'll use page.pdf() instead to generate a PDF and check page count
    // But first, let's simulate what html2pdf does by checking dimensions

    // Simulate PDF: temporarily remove padding, check dimensions
    const pdfDimInfo = await page.evaluate(() => {
      const el = document.getElementById('documentPreview');

      // Save original styles
      const origPadding = el.style.padding;
      const origMaxWidth = el.style.maxWidth;
      const origBoxShadow = el.style.boxShadow;

      // Apply PDF styles (same as our code does)
      el.style.padding = '0';
      el.style.maxWidth = 'none';
      el.style.boxShadow = 'none';

      const rect = el.getBoundingClientRect();

      // Restore
      el.style.padding = origPadding;
      el.style.maxWidth = origMaxWidth;
      el.style.boxShadow = origBoxShadow;

      return {
        pdfWidth: rect.width,
        pdfHeight: rect.height,
        // A4 content area with [20,15,15,15] margins:
        // width: 210-15-15 = 180mm, height: 297-20-15 = 262mm
        // Scale: content is scaled to fit 180mm width
        widthMM: rect.width / 96 * 25.4,
        heightMM: rect.height / 96 * 25.4,
      };
    });

    const contentWidthMM = 210 - 15 - 15; // 180mm
    const contentHeightMM = 297 - 20 - 15; // 262mm
    const scaleRatio = contentWidthMM / pdfDimInfo.widthMM;
    const scaledHeightMM = pdfDimInfo.heightMM * scaleRatio;
    const estimatedPages = Math.ceil(scaledHeightMM / contentHeightMM);

    console.log(`  PDF 시뮬레이션:`);
    console.log(`    콘텐츠 크기 (padding 제거): ${Math.round(pdfDimInfo.pdfWidth)}x${Math.round(pdfDimInfo.pdfHeight)}px`);
    console.log(`    mm 변환: ${pdfDimInfo.widthMM.toFixed(1)}x${pdfDimInfo.heightMM.toFixed(1)}mm`);
    console.log(`    축소 비율: ${scaleRatio.toFixed(3)}`);
    console.log(`    축소 후 높이: ${scaledHeightMM.toFixed(1)}mm (A4 가용: ${contentHeightMM}mm)`);
    console.log(`    예상 페이지 수: ${estimatedPages}장`);

    if (estimatedPages === 1) {
      console.log(`  ✓ PDF 1장 예상 — OK!`);
    } else {
      console.log(`  ⚠ PDF ${estimatedPages}장 예상 — 초과 ${(scaledHeightMM - contentHeightMM).toFixed(1)}mm`);
    }

    // Also verify styles are restored after "PDF generation"
    const restoredInfo = await page.evaluate(() => {
      const el = document.getElementById('documentPreview');
      const style = window.getComputedStyle(el);
      return { padding: style.padding, maxWidth: style.maxWidth };
    });
    console.log(`  스타일 복원: padding=${restoredInfo.padding}, maxWidth=${restoredInfo.maxWidth}`);

    await page.close();
    return { name: template.name, success: true, pages: estimatedPages, scaledHeight: scaledHeightMM };
  } catch (err) {
    console.log(`  ✗ 오류: ${err.message}`);
    await page.close();
    return { name: template.name, success: false, error: err.message };
  }
}

(async () => {
  console.log('PDF 생성 테스트 시작...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];
  for (const template of TEMPLATES) {
    const result = await testTemplate(browser, template);
    results.push(result);
  }

  await browser.close();

  // Summary
  console.log('\n\n========== 테스트 결과 요약 ==========');
  for (const r of results) {
    if (r.success) {
      const status = r.pages === 1 ? '✓ PASS' : '⚠ WARN';
      console.log(`  ${status} ${r.name}: ${r.pages}장 (높이 ${r.scaledHeight.toFixed(1)}mm / 262mm)`);
    } else {
      console.log(`  ✗ FAIL ${r.name}: ${r.error}`);
    }
  }
  console.log('======================================\n');
})();
