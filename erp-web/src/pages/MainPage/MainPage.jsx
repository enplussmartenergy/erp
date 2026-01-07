/** @jsxImportSource @emotion/react */
import React from 'react';
import Header from '../../components/common/MainHeader/MainHeader';
import Footer from '../../components/common/MainFooter/MainFooter';
import * as s from './style';
import { FileText, Database, Download } from 'lucide-react';

export default function MainPage() {
  return (
    <>
      <Header />

      <main css={s.main}>
        {/* Hero */} 
        <section css={s.section}>
          <div css={s.container}>
            <div css={s.heroGrid}>
              <div css={s.heroText}>
                <h1>효율적인 성능 점검 보고서 생성</h1>
                <p>기계설비 성능관리를 위한 자동화된 작성과 워크플로를 제공합니다.</p>

                <div css={s.cta}>
                  <a css={s.btnPrimary} href="/signup">지금 시작하기</a>
                  <a css={s.btnGhost} href="/about">서비스 알아보기</a>
                </div>
              </div>

              <div css={s.heroArt} aria-hidden="true">
                <div css={s.mockCard} />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section css={s.section}>
          <div css={s.container}>
            <h2>주요 기능</h2>
            <p css={s.sectionSub}>우리가 제공하는 핵심 기능을 확인해보세요.</p>

            <div css={s.features}>
              <div css={s.featureCard}>
                <div css={s.featureIcon}><FileText size={22} /></div>
                <h3>보고서 자동 생성</h3>
                <p>기계 설비 성능 점검 보고서를 템플릿으로 생성합니다.</p>
              </div>

              <div css={s.featureCard}>
                <div css={s.featureIcon}><Database size={22} /></div>
                <h3>데이터 관리</h3>
                <p>모든 진단 데이터를 안전하게 저장하고 효율적으로 관리하세요.</p>
              </div>

              <div css={s.featureCard}>
                <div css={s.featureIcon}><Download size={22} /></div>
                <h3>PDF 다운로드</h3>
                <p>서명 포함 보고서를 PDF로 즉시 다운로드할 수 있습니다.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Logos */}
        <section css={s.section}>
          <div css={s.container}>
            <h2>고객사 로고</h2>
            <div css={s.logos}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} css={s.logoCard}>
                  <div css={s.logoPlaceholder}>Customer logo {i + 1}</div>
                  <div css={s.logoName}>고객사 {i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
