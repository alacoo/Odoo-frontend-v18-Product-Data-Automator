
# Odoo API Requests

This file documents the API payloads used by the application to fetch data from the Odoo backend via the custom REST wrapper.

## 1. Fetch Products (Variants & Template Data)
**Endpoint:** `POST /send_request?model=product.product`

Retrieves storable and consumable products (Sale OK or Purchase OK). The application uses product variants (`product.product`) to infer template structure.

**Fields Explanation:**
*   `qty_available`: On Hand Quantity.
*   `virtual_available`: Forecasted Quantity.
*   `is_favorite`: Starred status in Odoo.
*   `image_128`: Thumbnail image (Base64).

```json
{
  "model": "product.product",
  "domain": ["|", ["sale_ok", "=", true], ["purchase_ok", "=", true]],
  "fields": [
    "id", "name", "display_name", "default_code", "lst_price", "standard_price",
    "qty_available", "virtual_available", "uom_id", "tracking", "categ_id", "currency_id",
    "barcode", "weight", "sale_ok", "purchase_ok", "type",
    "allow_variable_dimensions", "price_per_sqm", "variant_price_per_sqm",
    "product_template_attribute_value_ids", "image_128", "is_favorite"
  ],
  "limit": 300,
  "order": "id desc"
}
```

## 2. Fetch Currencies
**Endpoint:** `POST /send_request?model=res.currency`

Retrieves active currencies to calculate exchange rates.

```json
{
  "domain": [["active", "=", true]],
  "fields": ["id", "name", "symbol", "position", "active", "rate"],
  "order": "id asc"
}
```

## 3. Fetch Attributes
**Endpoint:** `POST /send_request?model=product.attribute`

Retrieves product attribute definitions (e.g., Color, Size).

```json
{
  "domain": [],
  "fields": ["id", "name", "display_type", "create_variant"],
  "order": "name asc"
}
```

## 4. Fetch Attribute Values
**Endpoint:** `POST /send_request?model=product.attribute.value`

Retrieves specific values for attributes (e.g., Red, Blue, XL).

```json
{
  "domain": [],
  "fields": ["id", "name", "attribute_id"],
  "order": "attribute_id asc, name asc"
}
```

## 5. Fetch Units of Measure (UOM)
**Endpoint:** `POST /send_request?model=uom.uom`

Retrieves available units of measure.

```json
{
  "domain": [],
  "fields": ["id", "name"],
  "order": "id asc"
}
```

## 6. Fetch Pricelists
**Endpoint:** `POST /send_request?model=product.pricelist`

Retrieves sales pricelists and their associated currencies.

```json
{
  "domain": [],
  "fields": ["id", "name", "currency_id"],
  "order": "id asc"
}
```

## 7. Authentication
**Endpoint:** `GET /odoo_connect`
**Headers:**
- `login`: User Email
- `password`: User Password
- `db`: Database Name

**Returns:** JSON object containing `api-key` and `uid`.

## 8. System Health Check
**Endpoint:** `PUT /call_method`

Checks backend capabilities and module installation status.

```json
{
  "model": "res.company",
  "method": "api_check_system_health",
  "ids": [1],
  "args": [],
  "kwargs": {}
}
```
