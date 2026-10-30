document.addEventListener('DOMContentLoaded', () => {
    // 1.商品データを読み込んでカードを生成

    const productContainer = document.querySelector('#productsContainer');

    // 絞り込み用の入力欄
    const brandFilter = document.querySelector('#brandFilter');
    const groundFilter = document.querySelector('#groundFilter');
    const resultCount = document.querySelector('#resultCount');

    // 商品詳細モーダルの要素
    const productModal = document.querySelector('#productModal');
    const closeProductModal = document.querySelector('#closeProductModal');

    const modalProductImage = document.querySelector('#modalProductImage');
    const modalProductBrand = document.querySelector('#modalProductBrand');
    const modalProductName = document.querySelector('#modalProductName');
    const modalProductPrice = document.querySelector('#modalProductPrice');
    const modalProductBadges = document.querySelector('#modalProductBadges');

    // JSONから読み込んだ商品を保存する配列
    let allProducts = [];

    // htmlに文字列を挿入する際のエスケープ処理
    const escapeHTML = (value) => {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        })[char]);
    };

    // 商品カードを生成する関数
    const createProductCard = (product) => {
        const badges = Array.isArray(product.badges)
            ? product.badges
            : [];

        const badgeHTML = badges.map((badge) => {
            // CSSクラスとして使える種類だけ許可する
            const allowedTypes = ['ag', 'hg', 'new'];
            const type = allowedTypes.includes(badge.type)
                ? badge.type
                : '';

            return `
            <span class="badge ${type ? `badge-${type}` : ''}">
            ${escapeHTML(badge.label)}
            </span>
            `;
        }).join('');

        const price = Number(product.price);

        if (!Number.isFinite(price) || price < 0) {
            throw new Error(`価格が不正です:${product.id}`);
        }
        return `
        <div class="product-card"
        data-product-id="${escapeHTML(product.id)}">

        <a href="#"
        class="product-link"
        aria-label="${escapeHTML(product.name)}">

        <div class="product-img-wrap">
        <img
        src="${escapeHTML(product.image)}"
        alt="${escapeHTML(product.alt || product.name)}"
        class="product-img"
        loading="lazy"
        >
        </div>

        <div class="product-badges">
        ${badgeHTML}
        </div>

        <div class="product-brand">
        ${escapeHTML(product.brand)}
        </div>

        <div class="product-name">
        ${escapeHTML(product.name)}
        </div>

        <div class="product-price">
        ${price.toLocaleString('ja-JP', {
            style: 'currency',
            currency: 'JPY',
            maximumFractionDigits: 0
        })}
        </div>
        </a>

        <button
        type="button"
        class="fav-btn"
        aria-label="お気に入りに追加"
        aria-pressed="false"
        >

        <svg viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        aria-hidden="true">
                        <path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            fill="transparent"
                            stroke="currentColor"
                            stroke-width="1.5">
                        </path>
                    </svg>
                </button>
            </div>
        `;
    };

    // JSONを取得して商品一覧を表示
    const loadProducts = async () => {
        if (!productContainer) return;

        try {
            const response = await fetch('./products.json');

            if (!response.ok) {
                throw new Error(
                    `商品データの取得に失敗しました:${response.status}`
                );
            }

            const data = await response.json();

            if (!Array.isArray(data.products)) {
                throw new Error(
                    'product.json の products は配列にしてください。'
                );
            }

            // 商品IDの重複をチェック
            const ids = data.products.map(product => product.id);

            // console.table(
            //     data.products.map((product, index) => ({
            //         index: index,
            //         id: product.id,
            //         name: product.name
            //     }))
            // );

            if (ids.some(id => !id) || new Set(ids).size !== ids.length) {
                throw new Error('商品IDが未設定、または重複しています。');
            }

            // 商品カードの数だけカードを生成
            // productContainer.innerHTML = data.products
            //     .map(createProductCard)
            //     .join('');

            // 読み込んだ商品データを保存
            allProducts = data.products;

            // 初期表示として絞り込みを実行
            applyFilters();

        } catch (error) {
            console.error('商品一覧の読み込みエラー:', error);

            productContainer.textContent = '商品を読み込めませんでした。時間をおいて再度お試しください。';
        }
    };


    // 商品詳細をモーダルに表示する関数
    const openProductModal = (product) => {
        if (!productModal) return;

        modalProductImage.src = product.image;
        modalProductImage.alt = product.alt || product.name;

        modalProductBrand.textContent = product.brand;
        modalProductName.textContent = product.name;

        modalProductPrice.textContent =
            Number(product.price).toLocaleString('ja-JP', {
                style: 'currency',
                currency: 'JPY',
                maximumFractionDigits: 0
            });

        // 商品のバッジを表示
        const badges = Array.isArray(product.badges)
            ? product.badges
            : [];

        modalProductBadges.innerHTML = badges.map((badge) => {
            const allowedTypes = ['ag', 'hg', 'new'];
            const type = allowedTypes.includes(badge.type)
                ? badge.type
                : '';

            return `
                <span class="badge ${type ? `badge-${type}` : ''}">
                    ${escapeHTML(badge.label)}
                </span>
            `;
        }).join('');

        // モーダルを表示
        productModal.classList.remove('is-hidden');
        productModal.setAttribute('aria-hidden', 'false');
    };

    // 商品一覧を表示する関数
    const renderProducts = (products) => {
        productContainer.innerHTML = products
            .map(createProductCard)
            .join('');

        // 商品件数を更新
        resultCount.textContent =
            `${products.length}件の商品が見つかりました`;
    };


    // 商品を絞り込む関数
    const applyFilters = () => {
        // 現在選択されている条件を取得
        const selectedBrand = brandFilter.value;
        const selectedGround = groundFilter.value;

        // 条件に合う商品だけを抽出
        const filteredProducts = allProducts.filter((product) => {
            // ブランドの条件
            const matchesBrand =
                selectedBrand === '' ||
                product.brand === selectedBrand;

            // グラウンドの条件
            const matchesGround =
                selectedGround === '' ||
                (Array.isArray(product.badges) &&
                    product.badges.some((badge) =>
                        badge.type === selectedGround
                    ));

            // 両方の条件に合う商品だけ残す
            return matchesBrand && matchesGround;
        });

        // 絞り込み結果を表示
        renderProducts(filteredProducts);
    };


    // ブランドが変更されたら再検索
    brandFilter.addEventListener('change', applyFilters);

    // グラウンドが変更されたら再検索
    groundFilter.addEventListener('change', applyFilters);

    // 初回の商品読み込み
    loadProducts();

    // 2.お気に入りボタン（動的に追加された商品にも対応）

    if (productContainer) {
        productContainer.addEventListener('click', (event) => {
            const button = event.target.closest('.fav-btn');

            if (!button) return;

            const isFavorite =
                button.getAttribute('aria-pressed') === 'true';

            const heartPath = button.querySelector('path');

            button.setAttribute(
                'aria-pressed',
                String(!isFavorite)
            );

            button.setAttribute(
                'aria-label',
                isFavorite
                    ? 'お気に入りに追加'
                    : 'お気に入りから削除'
            );

            if (heartPath) {
                heartPath.setAttribute(
                    'fill',
                    isFavorite ? 'transparent' : 'red'
                );
            }
        });
    }

    // 商品カードをクリックしたら詳細を開く
    if (productContainer) {
        productContainer.addEventListener('click', (event) => {
            const link = event.target.closest('.product-link');

            if (!link) return;

            event.preventDefault();

            const card = link.closest('.product-card');
            const productId = card.dataset.productId;

            const product = allProducts.find((item) => {
                return String(item.id) === productId;
            });

            if (product) {
                openProductModal(product);
            }
        });
    }

    // 商品詳細モーダルを閉じる
    const closeProductModalView = (e) => {
        if (!productModal) return;
        productModal.classList.add('is-hidden');
        productModal.setAttribute('aria-hidden', 'true');
    };

    // 閉じるボタン
    if (closeProductModal) {
        closeProductModal.addEventListener(
            'click',
            closeProductModalView
        );
    }

    // モーダルの背景をクリックした時も閉じる
    if (productModal) {
        productModal.addEventListener('click', (event) => {
            if (event.target === productModal) {
                closeProductModalView();
            }
        });
    }

    // Escapeキーでも閉じる
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' &&
            productModal &&
            !productModal.classList.contains('is-hidden')
        ) {
            closeProductModalView();
        }
    });

    // 3.紹介動画のポップアップ

    const openBtn = document.querySelector('#openVideoBtn');
    const overlay = document.querySelector('#videoOverlay');
    const closeBtn = document.querySelector('#closeBtn');
    const videoContainer = document.querySelector('.video-container');
    const video = document.querySelector('#videoOverlay video');


    // 動画を開く処理
    const openVideo = () => {
        if (!overlay) return;

        overlay.classList.remove('is-hidden');

        if (video) {
            video.currentTime = 0;
            video.play().catch(error => {
                console.log('動画の再生に失敗しました:', error);
            });
        }
    };

    const closeVideo = () => {
        if (!overlay) return;

        overlay.classList.add('is-hidden');

        if (video) {
            video.pause();
        }
    };

    if (openBtn) {
        openBtn.addEventListener('click', openVideo);
    }

    if (overlay) {
        overlay.addEventListener('click', (event) => {
            if (
                event.target === overlay ||
                event.target === videoContainer ||
                event.target === closeBtn
            ) {
                closeVideo();
            }
        });
    }

    // ヒーロースライダーを初期化
    const heroSliderElement = document.querySelector('.hero-swiper');

    if (heroSliderElement && typeof Swiper !== 'undefined') {
        const heroSwiper = new Swiper(heroSliderElement, {
            // 画像を1枚ずつ表示
            slidesPerView: 1,

            // 切り替えの速さ（ミリ秒）
            speed: 800,

            // 最後の画像から最初の画像へ戻る
            loop: true,

            // 自動再生
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            },

            // 左右の矢印
            navigation: {
                prevEl: '.hero-prev',
                nextEl: '.hero-next'
            },

            // 下部のドット
            pagination: {
                el: '.hero-pagination',
                clickable: true
            }
        });
    }

    // おすすめ特集スライダーの要素を取得
    const featureSlider = document.querySelector('.horizontal-scroll');
    const featurePrev = document.querySelector('#featurePrev');
    const featureNext = document.querySelector('#featureNext');

    // 前の特集へ移動
    if (featureSlider && featurePrev) {
        featurePrev.addEventListener('click', () => {
            featureSlider.scrollBy({
                left: -252,
                behavior: 'smooth'
            });
            // console.log(`戻るボタンクリック！`);
        });
    }

    // 次の特集へ移動
    if (featureSlider && featureNext) {
        featureNext.addEventListener('click', () => {
            featureSlider.scrollBy({
                left: 252,
                behavior: 'smooth'
            });
            // console.log(`進むボタンクリック！`);
        });
    }

});

// modalContent.addEventListener('click', function(event){
//     event.stopPropagation();
// });