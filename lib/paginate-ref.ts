// q === parsed.d.b.q
export const paginateRef = (ref, q) => {
	if (q) {
		Object.keys(q).forEach(key => {
			const value = q[key];
			switch (key) {
				case "sp": {
					ref = q["sn"] ? ref.startAt(value, q["sn"]) : ref.startAt(value);
					break;
				}
				case "ep": {
					ref = q["en"] ? ref.endAt(value, q["en"]) : ref.endAt(value);
					break;
				}
				case "i": {
					if (value === ".key") {
						ref = ref.orderByKey();
					} else if (value === ".value") {
						ref = ref.orderByValue();
					} else {
						ref = ref.orderByChild(value);
					}
					break;
				}
				case "l": {
					ref = q.vf === "l" ? ref.limitToFirst(value) : ref.limitToLast(value);
					break;
				}
				default: {
					break;
				}
			}
		});
	}
	return ref;
};

