window.__ModuleLoader__.load({
	id: "@yogemow/dsh-prism",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/controller.ts
		/**
		* DeepSeek Prism card form controller: staged edits over the
		* `deepseek-prism` settings namespace, plus the write-only API-key state
		* learned from the redacted describe (secrets never ride the wire).
		*/
		const PRISM_NAMESPACE = "deepseek-prism";
		/** Bridges the `deepseek-prism` scope onto the card's staged form. */
		var PrismCardController = class {
			scope;
			api;
			staged = /* @__PURE__ */ new Map();
			apiKeySet = false;
			saving = false;
			failed = false;
			store;
			/**
			* @param scope - the bound settings scope for the `deepseek-prism` namespace.
			* @param api - the loopback settings wire face.
			* @param ctx - the owning plugin context (secret-state invalidation rides its fiber).
			*/
			constructor(scope, api, ctx) {
				this.scope = scope;
				this.api = api;
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(this.project());
				this.scope.subscribe(() => {
					this.publish();
				});
				ctx.effect(() => {
					return ctx.remote.$on("settings/document-updated", (ns) => {
						if (ns === void 0 || ns === "deepseek-prism") this.refreshSecretState();
					});
				}, "dsh-prism: secret state invalidations");
				this.refreshSecretState();
			}
			/** Build the face the card's slot registration injects. */
			inject() {
				return {
					hooks: { prismCard: this.store },
					edit: (field, text) => {
						this.stage(field, text);
					},
					resetField: (field) => {
						this.stage(field, "");
					},
					toggle: (field) => {
						this.toggle(field);
					},
					save: () => {
						this.save();
					},
					discard: () => {
						if (this.staged.size === 0 && !this.failed) return;
						this.staged.clear();
						this.failed = false;
						this.publish();
					}
				};
			}
			/** Flip one display switch and write it immediately (no staged save needed). */
			async toggle(field) {
				if (this.saving) return;
				const current = this.scope.getSnapshot().value?.[field] ?? field === "showUsage";
				try {
					await this.scope.set(field, !current);
					this.failed = false;
				} catch {
					this.failed = true;
				}
				this.publish();
			}
			stage(field, text) {
				this.staged.set(field, text);
				this.failed = false;
				this.publish();
			}
			async save() {
				if (this.staged.size === 0 || this.saving) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				let landed = true;
				for (const [field, text] of this.staged) {
					const trimmed = text.trim();
					try {
						if (field === "apiKey") {
							if (trimmed !== "") await this.scope.set("apiKey", trimmed);
						} else if (trimmed === "") await this.scope.unset(field);
						else await this.scope.set(field, trimmed);
					} catch {
						landed = false;
					}
				}
				await this.refreshSecretState();
				const secretLanded = !this.staged.has("apiKey") || this.apiKeySet;
				if (landed && secretLanded) this.staged.clear();
				this.saving = false;
				this.failed = !(landed && secretLanded);
				this.publish();
			}
			/** Learn whether the apiKey slot holds a value from the redacted describe. */
			async refreshSecretState() {
				try {
					const response = await this.api.settings.describe({});
					if (!response.result.ok) return;
					const secret = response.result.value.namespaces.find((ns) => ns.ns === PRISM_NAMESPACE)?.secrets.find((slot) => slot.path.length === 1 && slot.path[0] === "apiKey");
					this.apiKeySet = secret?.set === true;
					this.publish();
				} catch {}
			}
			project() {
				const snapshot = this.scope.getSnapshot();
				const user = snapshot.user;
				const value = snapshot.value;
				const usage = value?.["showUsage"];
				const balance = value?.["showBalance"];
				return {
					available: snapshot.status === "ready",
					writable: snapshot.writable,
					dirty: this.staged.size > 0,
					saving: this.saving,
					failed: this.failed,
					apiKeySet: this.apiKeySet,
					apiKeyDraft: this.staged.get("apiKey") ?? "",
					showUsage: typeof usage === "boolean" ? usage : true,
					showBalance: typeof balance === "boolean" ? balance : false,
					model: this.field("model", value, user),
					baseUrl: this.field("baseUrl", value, user),
					region: this.field("region", value, user)
				};
			}
			field(name, value, user) {
				const staged = this.staged.get(name);
				const raw = value?.[name];
				return {
					text: staged ?? (typeof raw === "string" ? raw : ""),
					overridden: user !== void 0 && Object.hasOwn(user, name)
				};
			}
			publish() {
				this.store.set(this.project());
			}
		};
		//#endregion
		//#region \0dsh-css:E:\Git\repositoris\DeepSeek_Prism\dsh-plugin\src\client\PrismCard.module.css.mjs
		const css = ".R5HE-G_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.R5HE-G_card:hover{border-color:var(--dsw-alias-label-dimmed)}.R5HE-G_cardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.R5HE-G_header{appearance:none;width:100%;font:inherit;color:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.R5HE-G_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.R5HE-G_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.R5HE-G_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.R5HE-G_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.R5HE-G_chevron{border-right:1.5px solid var(--dsw-alias-label-tertiary);border-bottom:1.5px solid var(--dsw-alias-label-tertiary);flex:none;width:8px;height:8px;transition:transform .16s;transform:rotate(45deg)}.R5HE-G_cardOpen .R5HE-G_chevron{transform:rotate(-135deg)}.R5HE-G_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.R5HE-G_readOnly{color:var(--dsw-alias-label-tertiary);margin:12px 0 0;font-size:12px;line-height:1.5}.R5HE-G_pending{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.R5HE-G_footer{border-top:1px solid var(--dsw-alias-border-l2);justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;display:flex}.R5HE-G_failed{min-width:0;color:var(--dsw-alias-label-error);flex:1;margin:0;font-size:12px;line-height:1.5}.R5HE-G_discard,.R5HE-G_save{appearance:none;font:inherit;cursor:pointer;border:1px solid #0000;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.R5HE-G_discard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.R5HE-G_discard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.R5HE-G_save{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.R5HE-G_discard:disabled,.R5HE-G_save:disabled{opacity:.4;cursor:default}.R5HE-G_discard:focus-visible,.R5HE-G_save:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.R5HE-G_field{flex-direction:column;gap:6px;padding:12px 0;display:flex}.R5HE-G_field+.R5HE-G_field{border-top:1px solid var(--dsw-alias-border-l2)}.R5HE-G_head{align-items:center;gap:8px;display:flex}.R5HE-G_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.R5HE-G_badges{align-items:center;gap:8px;display:inline-flex}.R5HE-G_badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.R5HE-G_badgeMuted{white-space:nowrap;color:var(--dsw-alias-label-tertiary);border-radius:999px;padding:1px 8px;font-size:11px;line-height:17px}.R5HE-G_reset{font:inherit;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;padding:0;font-size:12px;line-height:1.5}.R5HE-G_reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.R5HE-G_reset:disabled{cursor:default}.R5HE-G_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.R5HE-G_input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.R5HE-G_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.R5HE-G_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.R5HE-G_checkbox{width:16px;height:16px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;flex:none;margin:0}.R5HE-G_checkbox:disabled{cursor:default;opacity:.5}";
		const tagId = "@yogemow/dsh-prism/PrismCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@yogemow/dsh-prism";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PrismCard_module_css_default = {
			"discard": "R5HE-G_discard",
			"headText": "R5HE-G_headText",
			"field": "R5HE-G_field",
			"badges": "R5HE-G_badges",
			"chevron": "R5HE-G_chevron",
			"hint": "R5HE-G_hint",
			"badgeMuted": "R5HE-G_badgeMuted",
			"body": "R5HE-G_body",
			"save": "R5HE-G_save",
			"head": "R5HE-G_head",
			"input": "R5HE-G_input",
			"readOnly": "R5HE-G_readOnly",
			"footer": "R5HE-G_footer",
			"failed": "R5HE-G_failed",
			"name": "R5HE-G_name",
			"label": "R5HE-G_label",
			"pending": "R5HE-G_pending",
			"header": "R5HE-G_header",
			"reset": "R5HE-G_reset",
			"badge": "R5HE-G_badge",
			"checkbox": "R5HE-G_checkbox",
			"card": "R5HE-G_card",
			"cardOpen": "R5HE-G_cardOpen",
			"description": "R5HE-G_description"
		};
		//#endregion
		//#region src/client/PrismCard.tsx
		/**
		* DeepSeek Prism settings card: staged form over the `deepseek-prism`
		* namespace, registered into the Plugins → Configurable settings tab.
		*
		* Card chrome and field rows are modelled on ui-settings-plugins' PluginCard
		* / ValueField / SecretField design (collapsible header, override badge,
		* reset, hint, and save/discard footer) so this card reads like the sibling
		* plugin cards; the shared components themselves stay package-private there,
		* so this bundle re-implements the same layout against the same theme tokens.
		*/
		/** Collapsible card chrome shared with the sibling plugin cards. */
		function PrismCardShell({ t, title, description, state, onSave, onDiscard, children }) {
			const [open, setOpen] = (0, react.useState)(false);
			if (!state.available) return null;
			const blocked = !state.dirty || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: PrismCard_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: PrismCard_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${t(open ? "collapse" : "expand")}: ${title}`,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: PrismCard_module_css_default.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PrismCard_module_css_default.name,
								children: title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PrismCard_module_css_default.description,
								children: description
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PrismCard_module_css_default.pending,
							children: t("unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: PrismCard_module_css_default.chevron,
							"aria-hidden": true
						})
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PrismCard_module_css_default.body,
					children: [
						!state.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PrismCard_module_css_default.readOnly,
							role: "status",
							children: t("readOnly")
						}) : null,
						children,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PrismCard_module_css_default.footer,
							children: [
								state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: PrismCard_module_css_default.failed,
									role: "status",
									children: t("saveFailed")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: PrismCard_module_css_default.discard,
									disabled: !state.dirty || state.saving,
									onClick: onDiscard,
									children: t("discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: PrismCard_module_css_default.save,
									disabled: blocked,
									onClick: onSave,
									children: t(state.saving ? "saving" : "save")
								})
							]
						})
					]
				}) : null]
			});
		}
		/** One field row: label, override badge with reset, control, and hint. */
		function PrismFieldRow({ id, label, hint, overridden, overriddenLabel, resetLabel, disabled, onReset, control }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PrismCard_module_css_default.field,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PrismCard_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: PrismCard_module_css_default.label,
							htmlFor: id,
							children: label
						}), overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: PrismCard_module_css_default.badges,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PrismCard_module_css_default.badge,
								children: overriddenLabel
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: PrismCard_module_css_default.reset,
								disabled,
								onClick: onReset,
								children: resetLabel
							})]
						}) : null]
					}),
					control,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PrismCard_module_css_default.hint,
						children: hint
					})
				]
			});
		}
		/**
		* Render the DeepSeek Prism card.
		* @param props - locale copy, the card snapshot, and its form actions.
		* @returns the card, or nothing when the namespace is unavailable.
		*/
		function PrismCard(props) {
			const { t } = props;
			const state = props.usePrismCard((snapshot) => snapshot);
			const disabled = !state.writable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PrismCardShell, {
				t,
				title: t("cardTitle"),
				description: t("cardDescription"),
				state,
				onSave: props.save,
				onDiscard: props.discard,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PrismCard_module_css_default.field,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PrismCard_module_css_default.head,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									className: PrismCard_module_css_default.label,
									htmlFor: "prism-settings-api-key",
									children: t("apiKeyLabel")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PrismCard_module_css_default.badges,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: state.apiKeySet ? PrismCard_module_css_default.badge : PrismCard_module_css_default.badgeMuted,
										children: state.apiKeySet ? t("apiKeySet") : t("apiKeyUnset")
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "prism-settings-api-key",
								className: PrismCard_module_css_default.input,
								type: "password",
								autoComplete: "off",
								value: state.apiKeyDraft,
								disabled,
								placeholder: "sk-…",
								onChange: (event) => {
									props.edit("apiKey", event.target.value);
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: PrismCard_module_css_default.hint,
								children: t("apiKeyHint")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrismFieldRow, {
						id: "prism-settings-model",
						label: t("modelLabel"),
						hint: t("modelHint"),
						overridden: state.model.overridden,
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						disabled,
						onReset: () => {
							props.resetField("model");
						},
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "prism-settings-model",
							className: PrismCard_module_css_default.input,
							type: "text",
							value: state.model.text,
							disabled,
							onChange: (event) => {
								props.edit("model", event.target.value);
							}
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrismFieldRow, {
						id: "prism-settings-base-url",
						label: t("baseUrlLabel"),
						hint: t("baseUrlHint"),
						overridden: state.baseUrl.overridden,
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						disabled,
						onReset: () => {
							props.resetField("baseUrl");
						},
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "prism-settings-base-url",
							className: PrismCard_module_css_default.input,
							type: "text",
							value: state.baseUrl.text,
							disabled,
							onChange: (event) => {
								props.edit("baseUrl", event.target.value);
							}
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PrismFieldRow, {
						id: "prism-settings-region",
						label: t("regionLabel"),
						hint: t("regionHint"),
						overridden: state.region.overridden,
						overriddenLabel: t("overridden"),
						resetLabel: t("reset"),
						disabled,
						onReset: () => {
							props.resetField("region");
						},
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
							id: "prism-settings-region",
							className: PrismCard_module_css_default.input,
							value: state.region.text,
							disabled,
							onChange: (event) => {
								props.edit("region", event.target.value);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "cn",
								children: t("regionCn")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: "global",
								children: t("regionGlobal")
							})]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PrismCard_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PrismCard_module_css_default.head,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: PrismCard_module_css_default.label,
								htmlFor: "prism-settings-show-usage",
								children: t("showUsageLabel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "prism-settings-show-usage",
								className: PrismCard_module_css_default.checkbox,
								type: "checkbox",
								checked: state.showUsage,
								disabled,
								onChange: () => {
									props.toggle("showUsage");
								}
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PrismCard_module_css_default.hint,
							children: t("showUsageHint")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PrismCard_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PrismCard_module_css_default.head,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: PrismCard_module_css_default.label,
								htmlFor: "prism-settings-show-balance",
								children: t("showBalanceLabel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "prism-settings-show-balance",
								className: PrismCard_module_css_default.checkbox,
								type: "checkbox",
								checked: state.showBalance,
								disabled,
								onChange: () => {
									props.toggle("showBalance");
								}
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PrismCard_module_css_default.hint,
							children: t("showBalanceHint")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const zh = {
			cardTitle: "DeepSeek Prism（识图）",
			cardDescription: "配置外部视觉 API 密钥与模型：让无法读图的纯文本模型通过 prism_see 工具提取图片事实。",
			apiKeyLabel: "视觉 API 密钥",
			apiKeyHint: "写后即掩，界面不回显；留空保存表示不修改。也可用环境变量 SILICONFLOW_API_KEY。",
			apiKeySet: "已设置",
			apiKeyUnset: "未设置",
			modelLabel: "视觉模型",
			modelHint: "OpenAI 兼容视觉模型 ID，默认 zai-org/GLM-4.5V。",
			baseUrlLabel: "API Base URL",
			baseUrlHint: "OpenAI 兼容接口根地址，默认 https://api.siliconflow.cn/v1。",
			regionLabel: "区域",
			regionHint: "cn 优先国内 Provider；global 优先国际 Provider。",
			regionCn: "cn（国内）",
			regionGlobal: "global（国际）",
			showUsageLabel: "显示识别消耗 token",
			showUsageHint: "在识别结果链接上显示本次消耗的 token 数。",
			showBalanceLabel: "显示余额与消耗额",
			showBalanceHint: "在识别结果展开区显示账户余额与本次消耗金额。",
			overridden: "已覆盖",
			reset: "重置",
			save: "保存",
			discard: "放弃",
			saving: "保存中…",
			saveFailed: "保存失败，请重试",
			readOnly: "当前设置文档只读，无法保存。",
			expand: "展开",
			collapse: "收起",
			unsaved: "有未保存的修改"
		};
		const en = {
			cardTitle: "DeepSeek Prism (vision)",
			cardDescription: "Configure the external vision API key and model: lets text-only models extract image facts through the prism_see tool.",
			apiKeyLabel: "Vision API key",
			apiKeyHint: "Write-only; never echoed back. Leave blank on save to keep the stored value. SILICONFLOW_API_KEY env is the fallback.",
			apiKeySet: "Configured",
			apiKeyUnset: "Not configured",
			modelLabel: "Vision model",
			modelHint: "OpenAI-compatible vision model ID. Default zai-org/GLM-4.5V.",
			baseUrlLabel: "API base URL",
			baseUrlHint: "OpenAI-compatible endpoint root. Default https://api.siliconflow.cn/v1.",
			regionLabel: "Region",
			regionHint: "cn prefers domestic providers; global prefers international ones.",
			regionCn: "cn (domestic)",
			regionGlobal: "global (international)",
			showUsageLabel: "Show recognition token usage",
			showUsageHint: "Show the token count spent on the recognition link.",
			showBalanceLabel: "Show balance and cost",
			showBalanceHint: "Show the account balance and per-recognition cost when expanded.",
			overridden: "Overridden",
			reset: "Reset",
			save: "Save",
			discard: "Discard",
			saving: "Saving…",
			saveFailed: "Save failed, try again",
			readOnly: "The settings document is read-only; saving is disabled.",
			expand: "Expand",
			collapse: "Collapse",
			unsaved: "Unsaved changes"
		};
		//#endregion
		//#region src/client/index.tsx
		/** Dictionary namespace owned by this plugin. */
		const NS = "dsh-prism";
		/** Required services (cordis fiber inject). */
		const inject = [
			"slots",
			"locale",
			"connection",
			"remote",
			"settingsScope"
		];
		/**
		* Register the settings card once its slot declaration is on the ledger.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const api = ctx.get("connection").api;
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-prism: card dictionaries");
			const controller = new PrismCardController(ctx.settingsScope.bind({ namespace: "deepseek-prism" }), api, ctx);
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "deepseek-prism",
				order: 30,
				locale: NS,
				inject: () => controller.inject()
			}, PrismCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map