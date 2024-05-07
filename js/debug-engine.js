class DebugEngine {
  #fields = new Map();
  #portal;

  init() {
    this.#portal = global["debug-fields"];
  }

  getDebug(name) {
    return this.#fields.get(name);
  }

  use(name, options) {
    if (this.#fields.has(name)) {
      return this.#fields.get(name).value;
    }

    return this.#addField(name, options);
  }

  #addField(name, options) {
    const { defaultValue, range } = options;

    this.#fields.set(name, {
      value: defaultValue,
      options: {
        range,
      },
    });
    const field = this.#fields.get(name);

    const div = document.createElement("div");
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = field.options.range[0];
    slider.max = field.options.range[1];
    slider.value = field.value.toString();

    slider.addEventListener("input", (event) => {
      field.value = Number(event.target.value);
      document.getElementById(name).innerText = `${name} : (${field.value}) `;
    });

    const label = document.createElement("label");
    label.id = name;
    label.innerText = `${name} : (${field.value}) `;

    div.appendChild(label);
    div.appendChild(slider);
    this.#portal.appendChild(div);

    return field.value;
  }
}

export default new DebugEngine(); // Singleton
