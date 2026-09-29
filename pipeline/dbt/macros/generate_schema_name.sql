{#
  Layers land in schemas named exactly `staging`, `intermediate`, `marts`
  (ADR-0006: separate schemas in one Postgres), not dbt's default
  `<target schema>_<custom schema>`.
#}
{% macro generate_schema_name(custom_schema_name, node) -%}
  {%- if custom_schema_name is none -%}
    {{ target.schema }}
  {%- else -%}
    {{ custom_schema_name | trim }}
  {%- endif -%}
{%- endmacro %}
