import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  listarPerfisUsuariosRtdb,
  removerUsuarioEPrimeiroLoginRtdb,
  type PerfilUsuarioRtdb,
} from "../services/realtimeDatabase";
import {
  authEmailToLoginUsername,
  isCapaUsername,
} from "../utils/authUsername";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash } from "lucide-react";
import "../styles/orders.css";

type ListRow = { uid: string; perfil: PerfilUsuarioRtdb };

export function UsersListPage() {
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowToDelete, setRowToDelete] = useState<ListRow | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const isCapa = useMemo(() => {
    const username = user?.displayName ?? authEmailToLoginUsername(user?.email);
    return isCapaUsername(username);
  }, [user?.displayName, user?.email]);

  const loggedInDisplayName = useMemo(() => {
    if (!user) return "";
    const fromProfile = user.displayName?.trim();
    if (fromProfile) return fromProfile;
    const fromSyntheticEmail = authEmailToLoginUsername(user.email);
    if (fromSyntheticEmail) return fromSyntheticEmail;
    return user.email ?? "Utilizador";
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const map = await listarPerfisUsuariosRtdb();
        if (cancelled) return;
        const list: ListRow[] = [];
        if (map) {
          for (const [uid, perfil] of Object.entries(map)) {
            if (
              perfil &&
              typeof perfil === "object" &&
              "nomeUsuario" in perfil
            ) {
              list.push({ uid, perfil });
            }
          }
        }
        list.sort((a, b) =>
          a.perfil.nomeUsuario.localeCompare(b.perfil.nomeUsuario, "pt-BR", {
            sensitivity: "base",
          }),
        );
        setRows(list);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : "Erro ao carregar utilizadores.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function confirmDeleteUser() {
    if (!rowToDelete) return;

    if (!isCapa) {
      toast.error("Apenas o usuário CAPA pode excluir usuários.");
      return;
    }

    if (isCapaUsername(rowToDelete.perfil.nomeUsuario)) {
      toast.error("O usuário CAPA não pode ser excluído.");
      return;
    }

    if (user?.uid && rowToDelete.uid === user.uid) {
      toast.error("Você não pode excluir o seu próprio usuário.");
      return;
    }

    setDeletingKey(rowToDelete.uid);
    try {
      await removerUsuarioEPrimeiroLoginRtdb(
        rowToDelete.uid,
        rowToDelete.perfil.nomeUsuario,
      );
      setRows((prev) => prev.filter((row) => row.uid !== rowToDelete.uid));
      toast.success("Usuário excluído com sucesso.");
      setRowToDelete(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível excluir o usuário.",
      );
    } finally {
      setDeletingKey(null);
    }
  }

  if (!isCapa) {
    return <Navigate to="/orders" replace />;
  }

  return (
    <div className="app-layout bg-linear-to-br from-muted/80 via-background to-muted/40">
      <header className="app-header border-border/60 bg-background/80 backdrop-blur-md">
        <div>
          <h1 className="font-heading text-lg tracking-widest uppercase text-foreground">
            Relojoaria Aprígio
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle interno de ordens de serviço
          </p>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:gap-3">
          {loggedInDisplayName ? (
            <span
              className="max-w-40 truncate text-sm text-muted-foreground sm:max-w-64"
              title={loggedInDisplayName}
            >
              Usuário Logado: {loggedInDisplayName}
            </span>
          ) : null}
          <Button asChild variant="outline">
            <Link to="/orders">Ordens</Link>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              void signOut();
            }}
          >
            Sair
          </Button>
        </div>
      </header>

      <main className="orders-main">
        <Card>
          <CardHeader>
            <CardTitle>Lista de usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadError ? (
              <p className="text-sm text-destructive" role="alert">
                {loadError}
              </p>
            ) : null}
            {loading ? (
              <div
                className="space-y-2"
                aria-busy="true"
                aria-label="A carregar"
              >
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground">
                        Nenhum perfil em `/usuarios`.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const lockedUser =
                        isCapaUsername(row.perfil.nomeUsuario) ||
                        row.uid === user?.uid;
                      return (
                        <TableRow key={row.uid}>
                          <TableCell className="font-medium">
                            {row.perfil.nomeUsuario}
                          </TableCell>
                          <TableCell className="text-right">
                            {lockedUser ? (
                              <></>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setRowToDelete(row)}
                                disabled={deletingKey !== null || lockedUser}
                                aria-label={`Excluir usuário ${row.perfil.nomeUsuario}`}
                                title={
                                  lockedUser
                                    ? "Este usuário não pode ser excluído"
                                    : "Excluir usuário"
                                }
                              >
                                <Trash className="h-4 w-4 cursor-pointer" color="red" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={isCapa && rowToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setRowToDelete(null);
        }}
      >
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
            <DialogDescription>
              {rowToDelete
                ? `Excluir o usuário "${rowToDelete.perfil.nomeUsuario}"? Isto remove o perfil em /usuarios e um registo correspondente em /login.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRowToDelete(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingKey !== null}
              onClick={() => void confirmDeleteUser()}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
