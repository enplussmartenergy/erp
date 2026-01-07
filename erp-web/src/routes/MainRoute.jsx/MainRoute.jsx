import React from 'react';
import MainContainer from '../../components/common/MainContainer/MainContainer';
import { Route, Routes } from 'react-router-dom';
import MainPage from '../../pages/MainPage/MainPage';
import LoginPage from '../../pages/Auth/LoginPage/LoginPage';
import SignUpPage from '../../pages/Auth/SignUpPage/SignUpPage';
import ReportCreatePage from '../../pages/Reports/Create/ReportCreateAPage/ReportCreatePage';

function MainRoute(props) {
    return (
        <MainContainer>
            <Routes>
                <Route path="*" element={<MainPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup/*" element={<SignUpPage />} />
                <Route path="/reports/create" element={<ReportCreatePage />} />
            </Routes>
        </MainContainer>
    );
}

export default MainRoute;