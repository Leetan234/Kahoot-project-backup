import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import EnterroomtPage from '../pages/EnterRoom/EnterRoom';
import Lobby from '../pages/Lobby/Lobby';
import React from 'react';
import LoginPage from "../pages/Login/Login";
import RegisterPage from "../pages/Register/RegisterUsername";
import EmailRegisterPage from "../pages/Register/RegisterMail"; 
import QuestionPage from "../pages/QuestionPage/QuestionPage";
import Host from "../pages/Host/Host";
import HostQuestionPage from "../pages/HostQuestion/HostQuestionPage";
import Leaderboard from "../pages/leaderboard/leaderboard";

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                {/* Public routes */}
                <Route path="/" element={<EnterroomtPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/enter-room" element={<EnterroomtPage />} />
                <Route path="/lobby/:gamePin" element={<Lobby  />} />
                <Route path="/host/:gamePin" element={<Host />} />
                <Route path="/QuestionPage/:sessionId/:questionInGameId" element={<QuestionPage />} />
                <Route path="/HostQuestionPage/:sessionId/:QuestionInGameID" element={<HostQuestionPage />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/register/username" element={<RegisterPage />} />
                <Route path="/register/signup-options" element={<EmailRegisterPage />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;