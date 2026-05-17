import React, { useState, useEffect } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FaCalendarAlt, FaEnvelope, FaEye, FaEyeSlash, FaLock, FaUser } from "react-icons/fa";
import { FaHouse } from "react-icons/fa6";
import { useToast } from "../components/ToastProvider";

function Perfil() {
  const [user, setUser] = useState({ nome: "", dataNascimento: "", email: "" });
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showSenhaAtual, setShowSenhaAtual] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatarData = (dataISO) => {
    if (!dataISO) return "";
    return format(new Date(dataISO), "dd/MM/yyyy", { locale: ptBR });
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/perfil');

        setUser(response.data);
      } catch (error) {
        console.error(
          "Erro ao buscar dados do usuário",
          error.response?.data || error.message
        );
        navigate("/");
      }
    };

    fetchUser();
  }, [navigate]);

  const handlePasswordChange = async () => {
    if (novaSenha !== confirmarSenha) {
      toast("As senhas nao coincidem.", "error");
      return;
    }

    const senhaForte =
      novaSenha.length >= 12 &&
      /[A-Z]/.test(novaSenha) &&
      /[a-z]/.test(novaSenha) &&
      /\d/.test(novaSenha) &&
      /[^A-Za-z0-9]/.test(novaSenha);

    if (!senhaForte) {
      toast("Use uma senha forte com 12+ caracteres, maiuscula, minuscula, numero e especial.", "error");
      return;
    }

    try {
      setSavingPassword(true);
      await api.put('/trocar-senha', { senhaAtual, novaSenha });

      toast("Senha alterada com sucesso!", "success");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error) {
      console.error(
        "Erro ao alterar senha",
        error.response?.data || error.message
      );
      toast(error.response?.data?.mensagem || "Erro ao alterar senha.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleGoHome = () => {
    navigate("/home");
  };

  const initials = user.nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="panel flex items-center justify-between bg-gradient-to-r from-cyan-700 to-teal-600 px-5 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Conta</p>
            <h1 className="text-2xl font-extrabold">Perfil do usuario</h1>
          </div>

          <button onClick={handleGoHome} className="btn-ghost border-white/30 bg-white/10 text-white hover:bg-white/20" type="button">
            <span className="inline-flex items-center gap-2">
              <FaHouse />
              <span>Voltar</span>
            </span>
          </button>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <article className="panel p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-lg font-extrabold text-teal-700">
                {initials || 'U'}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Informacoes pessoais</h2>
                <p className="text-sm text-slate-500">Dados do seu cadastro.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><FaUser /> Nome</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{user.nome || '--'}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><FaCalendarAlt /> Data de nascimento</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{formatarData(user.dataNascimento) || '--'}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><FaEnvelope /> E-mail</p>
                <p className="mt-1 text-sm font-semibold text-slate-800 break-all">{user.email || '--'}</p>
              </div>
            </div>
          </article>

          <article className="panel p-5 sm:p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Seguranca</h2>
            <p className="text-sm text-slate-500">Atualize sua senha com criterios fortes de protecao.</p>

            <div className="mt-4 space-y-3">
              <div className="relative">
                <input
                  type={showSenhaAtual ? 'text' : 'password'}
                  placeholder="Senha atual"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  className="field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSenhaAtual((prev) => !prev)}
                  aria-label={showSenhaAtual ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showSenhaAtual ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showNovaSenha ? 'text' : 'password'}
                  placeholder="Nova senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNovaSenha((prev) => !prev)}
                  aria-label={showNovaSenha ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showNovaSenha ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmarSenha ? 'text' : 'password'}
                  placeholder="Confirmar nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmarSenha((prev) => !prev)}
                  aria-label={showConfirmarSenha ? 'Ocultar confirmacao de senha' : 'Mostrar confirmacao de senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                >
                  {showConfirmarSenha ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p className="font-bold uppercase tracking-wider text-slate-500">Regras</p>
                <ul className="mt-2 space-y-1">
                  <li>Minimo de 12 caracteres</li>
                  <li>Maiuscula, minuscula, numero e especial</li>
                  <li>Confirmacao igual a nova senha</li>
                </ul>
              </div>

              <button
                onClick={handlePasswordChange}
                className="btn-primary w-full"
                type="button"
                disabled={savingPassword}
              >
                <span className="inline-flex items-center gap-2">
                  <FaLock />
                  {savingPassword ? 'Salvando...' : 'Alterar senha'}
                </span>
              </button>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}

export default Perfil;