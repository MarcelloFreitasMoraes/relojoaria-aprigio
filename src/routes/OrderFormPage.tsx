import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { type FormikHelpers, type FormikTouched, useFormik } from "formik";
import { toast } from "sonner";
import {
  centsDigitsToNumber,
  formatMoneyFromCentDigits,
  maskPhoneBR,
  normalizeEmailInput,
  priceToCentDigits,
} from "../utils/masks";
import { useNavigate, useParams } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { useAuth } from "../context/AuthContext";
import {
  createOrder,
  deleteOrder,
  getOrderById,
  updateOrder,
} from "../services/ordersService";
import {
  atualizarEspelhoClientesPorOrdem,
  atualizarCliente,
  clientePayloadDaOrdem,
  clienteParaOrdem,
  criarCliente,
  getRtdbAuthToken,
  obterCliente,
  removerCliente,
} from "../services/realtimeDatabase";
import { allocateNextOrdemServicoCode } from "../services/orderCounter";
import { firstFormikStringError } from "@/utils/formikErrors";
import { historicoGravacaoFromUser } from "../utils/historicoGravacao";
import type { Order, OrderFormType, OrderStatus } from "../types/order";
import { buildOrderFormSchema } from "@/schemas/orderFormPageSchema";
import { normalizeOrderStatus } from "@/utils/orderLabels";
import { OrderFormPageSkeleton } from "@/components/OrderFormPageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { LoaderCircle, Printer } from "lucide-react";
import "../styles/order-form.css";

type FormMode = "create" | "edit";

type OrderFormValues = Order;

const emptyOrder: OrderFormValues = {
  code: "",
  customerName: "",
  phone: "",
  email: "",
  brand: "",
  type: "",
  caseMaterial: "",
  dialColor: "",
  strap: "",
  mechanism: "",
  number: "",
  service: "",
  price: 0,
  entryDate: "",
  dueDate: "",
  notes: "",
  conditions: "",
  status: "analise",
  formType: "loja",
  aceitoTermos: false,
};

const fieldClass =
  "h-9 rounded-[0.6rem] border-zinc-300 text-sm shadow-none md:text-sm";

function toOrderPayload(values: OrderFormValues): Order {
  return {
    ...values,
    status: normalizeOrderStatus(values.status),
  };
}

export function OrderFormPage() {
  const { id, clienteId } = useParams<{
    id?: string;
    clienteId?: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderFormValues>(emptyOrder);
  const [initialLoading, setInitialLoading] = useState<boolean>(
    !!id || !!clienteId,
  );
  /** Centavos digitados para máscara de moeda (ex.: "1990" → R$ 19,90) */
  const [priceCentDigits, setPriceCentDigits] = useState("0");
  const orderPdfRef = useRef<HTMLDivElement>(null);
  const todayIsoLocal = useMemo(() => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
  }, []);

  const mode: FormMode = id || clienteId ? "edit" : "create";

  useEffect(() => {
    if (!id && !clienteId) return;

    let cancelled = false;

    async function loadFromFirestore() {
      try {
        const existing = await getOrderById(id!);
        if (cancelled) return;
        if (existing) {
          setOrderData({
            ...existing,
            phone: maskPhoneBR(existing.phone || ""),
            email: normalizeEmailInput(existing.email || ""),
            aceitoTermos: existing.aceitoTermos ?? false,
          });
        }
      } catch {
        toast.error("Não foi possível carregar a ordem.");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    async function loadFromClienteRtdb() {
      try {
        const c = await obterCliente(clienteId!);
        if (cancelled) return;
        if (c) {
          const o = clienteParaOrdem(c);
          setOrderData({
            ...o,
            phone: maskPhoneBR(o.phone || ""),
            email: normalizeEmailInput(o.email || ""),
            aceitoTermos: false,
          });
        }
      } catch {
        toast.error("Não foi possível carregar a ficha (Realtime Database).");
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    }

    if (clienteId) {
      void loadFromClienteRtdb();
    } else if (id) {
      void loadFromFirestore();
    }

    return () => {
      cancelled = true;
    };
  }, [id, clienteId]);

  const validationSchema = useMemo(() => buildOrderFormSchema(mode), [mode]);

  const formik = useFormik<OrderFormValues>({
    enableReinitialize: true,
    initialValues: orderData,
    validationSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (
      values,
      { setSubmitting, setValues }: FormikHelpers<OrderFormValues>,
    ) => {
      if (!user) return;
      try {
        const hist = historicoGravacaoFromUser(user);
        const orderComHistorico: Order = { ...toOrderPayload(values), ...hist };

        if (mode === "create") {
          const protocolCode = await allocateNextOrdemServicoCode();
          const orderWithCode: Order = {
            ...orderComHistorico,
            code: protocolCode,
          };
          flushSync(() => {
            setValues({ ...orderWithCode, aceitoTermos: values.aceitoTermos });
          });

          const rtdbToken = await getRtdbAuthToken();

          const { cliente: criado, status: statusCriarCliente } =
            await criarCliente(clientePayloadDaOrdem(orderWithCode), rtdbToken);
          const rtdbKey = criado.id;
          if (!rtdbKey) {
            throw new Error(
              "Realtime Database não devolveu o id do registo em clientes.",
            );
          }

          if (statusCriarCliente !== 200) {
            toast.error(
              `Cadastro em clientes respondeu HTTP ${statusCriarCliente}; operação cancelada.`,
            );
            return;
          }

          flushSync(() => {
            setSubmitting(false);
          });
          navigate(`/orders/cliente/${encodeURIComponent(rtdbKey)}/edit`, {
            replace: true,
          });

          let created: Awaited<ReturnType<typeof createOrder>>;
          try {
            created = await createOrder(
              {
                ...orderWithCode,
                price: Number(orderWithCode.price || 0),
              },
              user,
            );
          } catch (fsErr) {
            await removerCliente(rtdbKey).catch(() => {});
            const msg = fsErr instanceof Error ? fsErr.message : String(fsErr);
            toast.error(`Erro ao criar a ordem no Firestore. ${msg}`);
            navigate("/orders/new", { replace: true });
            throw fsErr;
          }

          try {
            await atualizarCliente(
              rtdbKey,
              { idFirestore: created.id },
              rtdbToken,
            );
          } catch (patchErr) {
            await deleteOrder(created.id).catch(() => {});
            await removerCliente(rtdbKey).catch(() => {});
            const msg =
              patchErr instanceof Error ? patchErr.message : String(patchErr);
            toast.error(`Erro ao associar a ordem ao cliente (RTDB). ${msg}`);
            navigate("/orders/new", { replace: true });
            throw patchErr;
          }

          toast.success("Ordem criada com sucesso.");
          return;
        }

        if (id) {
          const { id: _oid, ...payload } = orderComHistorico;
          await updateOrder(id, {
            ...payload,
            price: Number(orderComHistorico.price || 0),
          });
          await atualizarEspelhoClientesPorOrdem(id, orderComHistorico);
          toast.success("Ficha atualizada.");
          return;
        }

        if (clienteId) {
          const payloadCliente = {
            ...clientePayloadDaOrdem(orderComHistorico),
            idFirestore: values.id,
          };
          await atualizarCliente(clienteId, payloadCliente);
          if (values.id) {
            const { id: _oid, ...payload } = orderComHistorico;
            await updateOrder(values.id, {
              ...payload,
              price: Number(orderComHistorico.price || 0),
            });
          }
          toast.success("Ficha atualizada.");
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        toast.error(
          detail.includes("Realtime Database") || detail.includes("/clientes")
            ? `Não foi possível gravar em clientes (Realtime Database). ${detail}`
            : `Erro ao salvar a ordem. ${detail}`,
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  const printOrder = useReactToPrint({
    contentRef: orderPdfRef,
    documentTitle: () => {
      const raw = (formik.values.code || "sem-codigo").trim();
      const safe = raw.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 80);
      return `Ordem-${safe}`;
    },
    onPrintError: () => {
      toast.error("Não foi possível abrir a impressão.");
    },
  });

  useEffect(() => {
    if (initialLoading) return;
    setPriceCentDigits(priceToCentDigits(formik.values.price));
  }, [initialLoading, formik.values.price]);

  /** Alinha `formik.values.status` com o valor normalizado (evita UI com opção visível mas estado vazio / erro Yup). */
  useEffect(() => {
    if (initialLoading) return;
    const fixed = normalizeOrderStatus(formik.values.status);
    if (formik.values.status !== fixed) {
      void formik.setFieldValue("status", fixed, false);
    }
  }, [initialLoading, formik.values.status, formik.setFieldValue]);

  async function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = await formik.validateForm();
    if (Object.keys(errs).length > 0) {
      toast.error(
        firstFormikStringError(errs, "Verifique os campos do formulário."),
      );
      const touched = Object.fromEntries(
        Object.keys(formik.values).map((k) => [k, true]),
      ) as FormikTouched<OrderFormValues>;
      void formik.setTouched(touched);
      return;
    }
    await formik.submitForm();
  }

  function headerTitle(type: OrderFormType) {
    if (type === "assistencia") {
      return "SOLICITAÇÃO DE ENVIO DE RELÓGIO PARA ASSISTÊNCIA TÉCNICA";
    }
    return "ORDEM DE SERVIÇO – LOJA";
  }

  function termsText(type: OrderFormType) {
    if (type === "assistencia") {
      return "Trata-se de uma solicitação para envio do relógio do cliente acima discriminado para a Assistência Técnica no Rio de Janeiro. O orçamento será realizado na Assistência Técnica especificada pelo lojista dentro do prazo informado pela oficina. Os valores referentes ao conserto aceitos serão somados à taxa de envio. A responsabilidade pelo transporte e envio do objeto é do lojista e do cliente, conforme regras da relojoaria.";
    }
    return "O cliente autoriza a entrega dos objetos aqui mencionados ao portador deste talão. Os serviços serão executados conforme descrito e o cliente será avisado quando o relógio estiver pronto. Após 180 dias da data de entrega, os objetos não retirados poderão ser vendidos para pagamento das despesas de guarda e conserto.";
  }

  if (initialLoading) {
    return <OrderFormPageSkeleton />;
  }

  return (
    <div className="order-form-layout order-form-print-root">
      <div className="order-form-toolbar order-form-no-print">
        <Button
          type="button"
          variant="outline"
          className="order-form-secondary order-form-back rounded-full border-zinc-200 font-medium"
          onClick={() => navigate("/orders")}
        >
          ← Voltar às ordens
        </Button>
      </div>
      <div ref={orderPdfRef} className="order-form-pdf-capture w-full min-w-0">
        <header className="order-form-header">
          <h1>Relojoaria Aprígio - Valença RJ</h1>
          <p>{headerTitle(formik.values.formType)}</p>
          <p className="order-form-subheader">
            Rua dos Mineiros, 52 Loja 1 C. Via Veneto Valença-RJ. Cel (024)
            99866-8112
          </p>
        </header>

        <form className="order-form" onSubmit={handleFormSubmit} noValidate>
          <section className="order-form-topline">
            <div>
              <div className="order-form-field min-w-0">
                <Label htmlFor="code">Código *</Label>
                <Input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  value={formik.values.code}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  readOnly={mode === "create"}
                  placeholder={
                    mode === "create" ? "Gerado ao salvar" : undefined
                  }
                  title={
                    mode === "create"
                      ? "O número de protocolo é gerado ao clicar em Salvar ordem"
                      : undefined
                  }
                  required={mode !== "create"}
                  disabled
                  className={cn(fieldClass, "bg-zinc-50")}
                  aria-invalid={Boolean(
                    formik.touched.code && formik.errors.code,
                  )}
                />
              </div>
            </div>
            <div className="order-form-type-toggle">
              <span>Tipo de ficha:</span>
              <label className="flex cursor-pointer items-center gap-1.5 font-normal">
                <input
                  type="radio"
                  name="formType"
                  value="loja"
                  checked={formik.values.formType === "loja"}
                  onChange={() => formik.setFieldValue("formType", "loja")}
                  className="accent-indigo-600"
                />
                Loja
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 font-normal">
                <input
                  type="radio"
                  name="formType"
                  value="assistencia"
                  checked={formik.values.formType === "assistencia"}
                  onChange={() =>
                    formik.setFieldValue("formType", "assistencia")
                  }
                  className="accent-indigo-600"
                />
                Assistência técnica
              </label>
            </div>
          </section>

          <section className="order-form-section order-form-section-print">
            <div className="order-form-grid-cliente">
              <div className="flex min-w-0 flex-col gap-1 text-[0.85rem]">
                <Label htmlFor="customerName">Nome *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  value={formik.values.customerName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  required
                  className={fieldClass}
                  aria-invalid={Boolean(
                    formik.touched.customerName && formik.errors.customerName,
                  )}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1 text-[0.85rem]">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  value={formik.values.phone}
                  onChange={(e) =>
                    formik.setFieldValue("phone", maskPhoneBR(e.target.value))
                  }
                  onBlur={formik.handleBlur}
                  className={fieldClass}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1 text-[0.85rem]">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="nome@exemplo.com"
                  title="E-mail sem espaços, em minúsculas"
                  value={formik.values.email ?? ""}
                  onChange={(e) =>
                    formik.setFieldValue(
                      "email",
                      normalizeEmailInput(e.target.value),
                    )
                  }
                  onBlur={formik.handleBlur}
                  className={fieldClass}
                  aria-invalid={Boolean(
                    formik.touched.email && formik.errors.email,
                  )}
                />
              </div>
            </div>
          </section>

          <section className="order-form-section order-form-section-print">
            <div className="order-form-grid-watch">
              {(
                [
                  ["brand", "Marca", true],
                  ["type", "Tipo", true],
                  ["caseMaterial", "Caixa", true],
                  ["dialColor", "Mostrador", true],
                  ["strap", "Pulseira", true],
                  ["mechanism", "Mecanismo", true],
                  ["number", "Número", false],
                ] as const
              ).map(([name, label, required]) => (
                <div key={name} className="flex flex-col gap-1 text-[0.85rem]">
                  <Label htmlFor={name}>
                    {required ? `${label} *` : label}
                  </Label>
                  <Input
                    id={name}
                    name={name}
                    value={formik.values[name] as string}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className={fieldClass}
                    aria-invalid={Boolean(
                      formik.touched[name as keyof OrderFormValues] &&
                      formik.errors[name as keyof OrderFormValues],
                    )}
                  />
                </div>
              ))}
              <div className="order-form-field min-w-0">
                <Label htmlFor="service">Serviço *</Label>
                <Input
                  id="service"
                  name="service"
                  value={formik.values.service}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={cn(fieldClass, "w-full")}
                  aria-invalid={Boolean(
                    formik.touched.service && formik.errors.service,
                  )}
                />
              </div>
            </div>
          </section>

          <section className="order-form-section order-form-section-print">
            <div className="order-form-grid-service-row">
              <div className="order-form-field min-w-0">
                <Label htmlFor="price">Valor (R$)</Label>
                <Input
                  id="price"
                  name="price"
                  type="text"
                  inputMode="numeric"
                  autoComplete="transaction-amount"
                  placeholder="0,00"
                  aria-label="Valor em reais"
                  value={formatMoneyFromCentDigits(priceCentDigits)}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 14);
                    const digits = raw || "0";
                    setPriceCentDigits(digits);
                    void formik.setFieldValue(
                      "price",
                      centsDigitsToNumber(digits),
                    );
                  }}
                  onBlur={formik.handleBlur}
                  className={fieldClass}
                  aria-invalid={Boolean(
                    formik.touched.price && formik.errors.price,
                  )}
                />
              </div>
              <div className="order-form-field min-w-0">
                <Label htmlFor="entryDate">Data entrada *</Label>
                <Input
                  id="entryDate"
                  name="entryDate"
                  type="date"
                  min={todayIsoLocal}
                  value={formik.values.entryDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    void formik.setFieldValue("entryDate", next);
                    const due = formik.values.dueDate;
                    if (due && next && due < next) {
                      void formik.setFieldValue("dueDate", next);
                    }
                  }}
                  onBlur={formik.handleBlur}
                  className={fieldClass}
                  aria-invalid={Boolean(
                    formik.touched.entryDate && formik.errors.entryDate,
                  )}
                />
              </div>
              <div className="order-form-field min-w-0">
                <Label htmlFor="dueDate">Data prevista</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  min={
                    formik.values.entryDate?.trim()
                      ? formik.values.entryDate
                      : undefined
                  }
                  value={formik.values.dueDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  className={fieldClass}
                  aria-invalid={Boolean(
                    formik.touched.dueDate && formik.errors.dueDate,
                  )}
                />
                {formik.touched.dueDate && formik.errors.dueDate ? (
                  <p className="text-xs text-destructive" role="alert">
                    {formik.errors.dueDate}
                  </p>
                ) : null}
              </div>
              <div className="order-form-field min-w-0">
                <Label htmlFor="status">Situação *</Label>
                <Select
                  value={normalizeOrderStatus(formik.values.status)}
                  onValueChange={(v) => {
                    void formik.setFieldValue("status", v as OrderStatus);
                    void formik.setFieldTouched("status", true);
                  }}
                >
                  <SelectTrigger
                    id="status"
                    className={cn(
                      fieldClass,
                      "h-9 w-full min-w-0 border-zinc-300 py-0 pr-2",
                    )}
                    aria-invalid={Boolean(
                      formik.touched.status && formik.errors.status,
                    )}
                  >
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="analise">Em análise</SelectItem>
                    <SelectItem value="servico">Em serviço</SelectItem>
                    <SelectItem value="pronto">Pronto</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
                  <div className="order-form-notes-print-only order-form-grid-notes-print mt-[0.85rem] hidden text-[0.82rem] leading-snug">
                    <p className="order-form-notes-print-cell text-left">
                      <span className="font-semibold">Observação:</span>{" "}
                      <span className="whitespace-pre-wrap">
                        {(formik.values.notes ?? "").trim() || "—"}
                      </span>
                    </p>
                    <p className="order-form-notes-print-cell text-left">
                      <span className="font-semibold">Condições:</span>{" "}
                      <span className="whitespace-pre-wrap">
                        {(formik.values.conditions ?? "").trim() || "—"}
                      </span>
                    </p>
                  </div>
                  <div className="order-form-grid-textareas order-form-no-print">
                    <div className="order-form-field min-w-0">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formik.values.notes ?? ""}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        rows={3}
                        className={cn(
                          "min-h-18 rounded-[0.6rem] border-zinc-300 text-sm",
                        )}
                      />
                    </div>
                    <div className="order-form-field min-w-0">
                      <Label htmlFor="conditions">Condições</Label>
                      <Textarea
                        id="conditions"
                        name="conditions"
                        value={formik.values.conditions ?? ""}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        rows={3}
                        className={cn(
                          "min-h-18 rounded-[0.6rem] border-zinc-300 text-sm",
                        )}
                      />
                    </div>
                  </div>
          </section>

          <section className="order-form-section order-form-section-print">
            <h2>Termos do serviço</h2>
            <p className="order-form-terms">
              {termsText(formik.values.formType)}
            </p>
          </section>

          <footer className="order-form-footer order-form-footer-row">
            <div className="order-form-footer-client w-full max-w-md print:max-w-none">
              <div className="order-form-accept-signature-row flex w-full flex-col gap-4 print:flex-row print:items-end print:justify-between print:gap-3">
                <label className="order-form-terms-accept flex min-w-0 cursor-pointer items-start gap-2 text-[0.85rem] leading-snug print:max-w-[52%] print:shrink">
                  <input
                    type="checkbox"
                    name="aceitoTermos"
                    checked={formik.values.aceitoTermos}
                    onChange={(e) =>
                      formik.setFieldValue("aceitoTermos", e.target.checked)
                    }
                    onBlur={formik.handleBlur}
                    className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 accent-indigo-600"
                  />
                  <span>
                    Declaro que li e aceito os{" "}
                    <strong className="font-semibold">Termos de Serviço</strong>
                  </span>
                </label>

                <div className="order-form-signature w-full print:mt-0 print:w-auto print:min-w-36 print:max-w-[46%] print:flex-1">
                  <p className="mb-1 text-center text-[0.75rem] text-zinc-500 print:mb-0.5 print:text-[0.65rem]">
                    Ciência / assinatura do cliente
                  </p>
                  <div className="order-form-signature-line" />
                </div>
              </div>
            </div>

            <div className="order-form-footer-actions order-form-no-print">
              {clienteId ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-emerald-600 bg-emerald-50/80 px-6 text-emerald-800 hover:bg-emerald-100"
                  title="Abre a janela de impressão; escolha Guardar como PDF para descarregar."
                  aria-label="Imprimir ficha ou guardar como PDF"
                  onClick={() => {
                    printOrder();
                  }}
                >
                  <Printer className="mr-2 inline size-4" aria-hidden />
                  Imprimir / PDF
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="order-form-secondary rounded-full border-zinc-200 px-6"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="order-form-primary gap-2 rounded-full border-0 bg-indigo-600 px-6 hover:bg-indigo-700"
                disabled={formik.isSubmitting}
              >
                {formik.isSubmitting ? (
                  <>
                    <LoaderCircle
                      className="shrink-0 animate-spin"
                      size={16}
                      aria-hidden
                    />
                    A guardar...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
