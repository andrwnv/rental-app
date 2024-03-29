import React, { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';

import api from '../../services/api';
import cookies from '../../services/cookies';
import logoSmall from '../../assets/logosmall.png';

import './Login.css';


export default function Login({history}) {
    if( cookies.get('token') ) {
        history.push('/dashboard');
    }

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [bannedModal, showBannedModal] = useState(false);

    let _status = 0;

    async function handleSubmitLogin(event) {
        event.preventDefault();

        const data = {
            eMail: email,
            password: password
        };

        try {
            const res = await api.post('http://localhost:3080/client/login', data);
            _status = res.status;

            const clientData = res.data.data.client_data;

            if( clientData.banned ) {
                showBannedModal(true);
                return;
            }

            localStorage.setItem('firstName', clientData.firstName);
            localStorage.setItem('lastName', clientData.lastName);
            localStorage.setItem('photoLink', clientData.photoLink);

            cookies.set('token', res.data.data.token, {
                path: '/',
            });

        } catch(err) {
            if( err.response ) {
                _status = err.response.status;
            }
        }

        if( _status >= 400 && _status < 500 ) {
            alert('Неправильно введены данные или пользователя не существует!');
            return;
        }

        if( _status === 200 ) {
            history.push('/dashboard');
        }
    }

    async function handleSubmitReg(event) {
        event.preventDefault();
        history.push('/register');
    }

    return (
        <div className = 'login'>
            <Modal
                show = {bannedModal} onHide = {() => {
                showBannedModal(false)
            }}
            >
                    <Modal.Header closeButton>
                        <Modal.Title>БАН!</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Вы были заблокировны модератором или администратором!
                    </Modal.Body>
                    <Modal.Footer>
                        <Button
                            variant = 'secondary' onClick = {() => {
                            showBannedModal(false)
                        }}
                        >
                            Ясно(
                        </Button>
                    </Modal.Footer>
                </Modal>

            <img src = {logoSmall} alt = '' id = 'logo' />
            <div className = 'containerLogin'>
                <div className = 'contentLogin'>
                    <p>Войти</p>
                    <form onSubmit = {handleSubmitLogin}>
                        <label htmlFor = 'email'>E-mail *</label>
                        <input
                            type = 'text'
                            id = 'email'
                            placeholder = 'Скажи нам свой e-mail...'
                            value = {email}
                            onChange = {event => setEmail(event.target.value)}
                        />
                        <label htmlFor = 'email'>Пароль *</label>
                        <input
                            type = 'password'
                            id = 'password'
                            placeholder = 'Введи пароль...'
                            value = {password}
                            onChange = {event => setPassword(event.target.value)}
                        />
                        <button type = 'submit' className = 'btn'>
                            Войти
                        </button>
                    </form>
                </div>
            </div>

            <div className = 'containerLogin'>
                <div className = 'contentLogin'>
                    <p>Нет аккаунта?</p>
                    <form onSubmit = {handleSubmitReg}>
                        <button type = 'submit' className = 'btn'>
                            Зарегестрироваться
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
