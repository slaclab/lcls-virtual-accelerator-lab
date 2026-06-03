FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM mambaforge/mambaforge:latest
WORKDIR /app

# Install pytao (Bmad shared library) via conda — not available via pip
RUN mamba install -y -c conda-forge pytao && mamba clean -afy

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir \
    git+https://github.com/slaclab/virtual-accelerator.git \
    git+https://github.com/slaclab/LCLS_FEL_Surrogate.git

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./static/

ENV LCLS_LATTICE=/lattice
ENV NUM_GROUPS=6
ENV KMP_DUPLICATE_LIB_OK=TRUE

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
